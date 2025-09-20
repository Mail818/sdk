#!/usr/bin/env node

/**
 * Basic usage example for Mail818 SDK
 */

// This would normally be: import { Mail818Client } from '@mail818/sdk'
import { Mail818Client } from '../dist/index.mjs'

async function main() {
  // Initialize the client
  const mail818 = new Mail818Client('your-api-key', {
    listId: 'your-list-id',
    baseUrl: 'http://localhost:8787' // Use local dev server
  })

  try {
    console.log('Submitting email...')
    
    // Submit an email
    const result = await mail818.submit({
      email: 'test@example.com',
      name: 'John Doe',
      subject: 'Test from SDK',
      message: 'This is a test message sent from the Mail818 SDK!',
      metadata: {
        source: 'sdk-example',
        timestamp: new Date().toISOString()
      }
    })

    console.log('✅ Success!')
    console.log('Email ID:', result.id)
    console.log('Message:', result.message)

    // Check rate limit info
    const rateLimit = mail818.getRateLimitInfo()
    if (rateLimit) {
      console.log('\nRate Limit Info:')
      console.log(`  Limit: ${rateLimit.limit}`)
      console.log(`  Remaining: ${rateLimit.remaining}`)
      console.log(`  Reset: ${rateLimit.reset}`)
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    
    if (error.code) {
      console.error('Error Code:', error.code)
    }
    
    if (error.statusCode) {
      console.error('Status Code:', error.statusCode)
    }
    
    if (error.details) {
      console.error('Details:', error.details)
    }
  }
}

// Run the example
main().catch(console.error)