#!/usr/bin/env node

/**
 * Node.js Script Example for Mail818 SDK
 * 
 * This example demonstrates using the Mail818 SDK in a Node.js environment
 * for batch email submissions, CSV imports, or server-side integrations.
 */

const { Mail818Client, Mail818ValidationError } = require('@mail818/sdk')
const fs = require('node:fs').promises
const path = require('node:path')
const readline = require('node:readline')

// Load environment variables (you can use dotenv package)
const API_KEY = process.env.MAIL818_API_KEY || 'your-api-key'
const LIST_ID = process.env.MAIL818_LIST_ID || 'your-list-id'

// Initialize client
const client = new Mail818Client(API_KEY, {
  listId: LIST_ID,
  baseUrl: process.env.MAIL818_API_URL || 'https://api.mail818.com',
  timeout: 30000
})

/**
 * Submit a single email
 */
async function submitSingleEmail() {
  try {
    const response = await client.submit({
      email: 'test@example.com',
      name: 'Test User',
      metadata: {
        source: 'node-script',
        timestamp: new Date().toISOString()
      }
    })
    
    if (response.success) {
      console.log('✅ Email submitted successfully:', response.id)
    } else {
      console.error('❌ Submission failed:', response.message)
    }
  } catch (error) {
    if (error instanceof Mail818ValidationError) {
      console.error('Validation error:', error.message)
    } else {
      console.error('Error submitting email:', error.message)
    }
  }
}

/**
 * Import emails from CSV file
 */
async function importFromCSV(filePath) {
  console.log(`📁 Importing emails from ${filePath}...`)
  
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())
    
    // Assume CSV format: email,name,notes
    const headers = lines[0].split(',').map(h => h.trim())
    const emailIndex = headers.indexOf('email')
    const nameIndex = headers.indexOf('name')
    const notesIndex = headers.indexOf('notes')
    
    if (emailIndex === -1) {
      throw new Error('CSV must have an "email" column')
    }
    
    let successful = 0
    let failed = 0
    const errors = []
    
    // Process each row (skip header)
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.trim())
      const email = row[emailIndex]
      
      if (!email) continue
      
      try {
        const response = await client.submit({
          email,
          name: nameIndex !== -1 ? row[nameIndex] : undefined,
          message: notesIndex !== -1 ? row[notesIndex] : undefined,
          metadata: {
            source: 'csv-import',
            fileName: path.basename(filePath),
            rowNumber: i + 1
          }
        })
        
        if (response.success) {
          successful++
          console.log(`✅ Row ${i}: ${email}`)
        } else {
          failed++
          errors.push({ row: i, email, error: response.message })
          console.log(`❌ Row ${i}: ${email} - ${response.message}`)
        }
        
        // Rate limiting - wait between requests
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        failed++
        errors.push({ row: i, email, error: error.message })
        console.error(`❌ Row ${i}: ${email} - ${error.message}`)
        
        // If rate limited, wait longer
        if (error.retryAfter) {
          console.log(`⏸️  Rate limited. Waiting ${error.retryAfter} seconds...`)
          await new Promise(resolve => setTimeout(resolve, error.retryAfter * 1000))
        }
      }
    }
    
    // Summary
    console.log('\n📊 Import Summary:')
    console.log(`✅ Successful: ${successful}`)
    console.log(`❌ Failed: ${failed}`)
    
    if (errors.length > 0) {
      // Save errors to file
      const errorFile = filePath.replace('.csv', '-errors.json')
      await fs.writeFile(errorFile, JSON.stringify(errors, null, 2))
      console.log(`📄 Errors saved to: ${errorFile}`)
    }
    
  } catch (error) {
    console.error('Error reading CSV:', error.message)
  }
}

/**
 * Interactive CLI for email submission
 */
async function interactiveCLI() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  const question = (prompt) => new Promise(resolve => {
    rl.question(prompt, resolve)
  })
  
  console.log('📧 Mail818 Email Submission CLI')
  console.log('================================\n')
  
  try {
    const email = await question('Email address: ')
    const name = await question('Name (optional): ')
    const message = await question('Message (optional): ')
    
    console.log('\nSubmitting...')
    
    const response = await client.submit({
      email: email.trim(),
      name: name.trim() || undefined,
      message: message.trim() || undefined,
      metadata: {
        source: 'cli',
        interactive: true
      }
    })
    
    if (response.success) {
      console.log('✅ Email submitted successfully!')
      console.log('ID:', response.id)
    } else {
      console.error('❌ Submission failed:', response.message)
    }
    
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    rl.close()
  }
}

/**
 * Express.js middleware example
 */
function createMail818Middleware(options = {}) {
  const middlewareClient = new Mail818Client(
    options.apiKey || API_KEY,
    {
      listId: options.listId || LIST_ID,
      ...options
    }
  )
  
  return async (req, res, next) => {
    // Add Mail818 client to request
    req.mail818 = middlewareClient
    
    // Add convenience method
    req.submitEmail = async (email, data = {}) => {
      try {
        const response = await middlewareClient.submit({
          email,
          ...data,
          metadata: {
            ...data.metadata,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            referer: req.get('referer')
          }
        })
        return response
      } catch (error) {
        throw error
      }
    }
    
    next()
  }
}

/**
 * Example Express.js route
 */
function expressExample() {
  const express = require('express')
  const app = express()
  
  app.use(express.json())
  app.use(createMail818Middleware())
  
  app.post('/api/subscribe', async (req, res) => {
    const { email, name } = req.body
    
    try {
      const response = await req.submitEmail(email, { name })
      
      if (response.success) {
        res.json({ success: true, message: 'Subscribed successfully' })
      } else {
        res.status(400).json({ success: false, message: response.message })
      }
    } catch (error) {
      console.error('Subscription error:', error)
      
      if (error instanceof Mail818ValidationError) {
        res.status(400).json({ 
          success: false, 
          message: 'Invalid email address' 
        })
      } else if (error.statusCode === 429) {
        res.status(429).json({ 
          success: false, 
          message: 'Too many requests. Please try again later.' 
        })
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'An error occurred. Please try again.' 
        })
      }
    }
  })
  
  app.listen(3000, () => {
    console.log('Server running on http://localhost:3000')
  })
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  
  switch (command) {
    case 'submit':
      await submitSingleEmail()
      break
      
    case 'import':
      const csvFile = args[1]
      if (!csvFile) {
        console.error('Please provide a CSV file path')
        process.exit(1)
      }
      await importFromCSV(csvFile)
      break
      
    case 'interactive':
      await interactiveCLI()
      break
      
    case 'server':
      expressExample()
      break
      
    default:
      console.log('Mail818 CLI - Available commands:')
      console.log('  node node-script.js submit       - Submit a test email')
      console.log('  node node-script.js import <csv> - Import emails from CSV')
      console.log('  node node-script.js interactive  - Interactive email submission')
      console.log('  node node-script.js server       - Start Express.js example server')
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error)
}

// Export for use as module
module.exports = {
  client,
  submitSingleEmail,
  importFromCSV,
  createMail818Middleware
}