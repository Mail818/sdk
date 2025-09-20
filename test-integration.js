#!/usr/bin/env node

/**
 * Integration test for Mail818 SDK
 * Tests against the local API
 */

import { Mail818Client } from './dist/index.mjs'

// You'll need to create a project first using the API
const TEST_PROJECT_ID = '01HXXXXXXXXXXXXXXXXXXXXXXX' // Replace with actual project ID
const API_URL = 'http://localhost:8787'

async function testSDK() {
  console.log('🧪 Testing Mail818 SDK...\n')

  // Test 1: Initialize without API key (should work for public endpoints)
  console.log('Test 1: Initialize client')
  const client = new Mail818Client(null, {
    projectId: TEST_PROJECT_ID,
    baseUrl: API_URL
  })
  console.log('✅ Client initialized\n')

  // Test 2: Submit valid email
  console.log('Test 2: Submit valid email')
  try {
    const result = await client.submit({
      email: 'test@example.com',
      name: 'SDK Test User',
      subject: 'Test from SDK',
      message: 'This is a test message from the Mail818 SDK integration test.'
    })
    console.log('✅ Email submitted successfully')
    console.log('   ID:', result.id)
    console.log('   Message:', result.message)
    
    // Check rate limit
    const rateLimit = client.getRateLimitInfo()
    if (rateLimit) {
      console.log('   Rate limit:', `${rateLimit.remaining}/${rateLimit.limit}`)
    }
    console.log()
  } catch (error) {
    console.error('❌ Failed:', error.message)
    console.error('   Code:', error.code)
    console.error('   Status:', error.statusCode)
    console.log()
  }

  // Test 3: Invalid email
  console.log('Test 3: Submit invalid email')
  try {
    await client.submit({
      email: 'not-an-email',
      name: 'Test User'
    })
    console.error('❌ Should have thrown validation error')
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR') {
      console.log('✅ Validation error caught correctly')
      console.log('   Message:', error.message)
      console.log('   Field:', error.field)
    } else {
      console.error('❌ Unexpected error:', error.message)
    }
    console.log()
  }

  // Test 4: Missing project ID
  console.log('Test 4: Submit without project ID')
  const clientNoProject = new Mail818Client()
  try {
    await clientNoProject.submit({
      email: 'test@example.com'
    })
    console.error('❌ Should have thrown validation error')
  } catch (error) {
    if (error.message.includes('Project ID is required')) {
      console.log('✅ Project ID validation working')
      console.log('   Message:', error.message)
    } else {
      console.error('❌ Unexpected error:', error.message)
    }
    console.log()
  }

  // Test 5: Override project ID
  console.log('Test 5: Override project ID')
  try {
    await client.submit({
      email: 'override@example.com',
      name: 'Override Test',
      projectId: '01H0000000000000000000000A' // Different project ID
    })
    console.log('✅ Project ID override working')
  } catch (error) {
    console.log('ℹ️  Override test failed (expected if project doesn\'t exist)')
    console.log('   Message:', error.message)
  }
  console.log()

  // Test 6: Generate ID
  console.log('Test 6: Generate ULID')
  const id = client.generateId()
  console.log('✅ Generated ID:', id)
  console.log('   Length:', id.length)
  console.log('   Valid:', /^[0-9A-Z]{26}$/.test(id) ? 'Yes' : 'No')
  console.log()

  console.log('🎉 SDK integration tests completed!')
}

// Run tests
testSDK().catch(console.error)