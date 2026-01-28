#!/usr/bin/env node

// Test Event Creation Script
// Creates a comprehensive test event with all 8 reminder types enabled

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function createTestEvent() {
  try {
    console.log('🚀 Creating test event for Phase 4 reminder system...');
    
    // 1. Create test organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'Test Organization',
        description: 'Organization for Phase 4 test event',
        settings: {}
      })
      .select()
      .single();

    if (orgError) throw orgError;
    console.log('✅ Created test organization:', organization.id);

    // 2. Create test event with all 8 reminder types enabled
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // 30 days from now
    
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        name: 'Phase 4 Test Event - All Reminders',
        description: 'Test event for Phase 4 reminder system with all 8 reminder types enabled',
        start_date: futureDate.toISOString(),
        end_date: new Date(futureDate.getTime() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours later
        registration_open: new Date(futureDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days before
        registration_close: new Date(futureDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day before
        venue_name: 'Test Venue',
        venue_address: 'Test Address, Test City',
        organization_id: organization.id,
        settings: {
          reminders: {
            activation: true,
            pre_event: true,
            event_start: true,
            event_end: true,
            post_event: true,
            follow_up: true,
            feedback: true,
            survey: true
          }
        }
      })
      .select()
      .single();

    if (eventError) throw eventError;
    console.log('✅ Created test event:', event.id);

    // 3. Create test participants
    const participants = [
      { firstName: 'Test', lastName: 'User 1', phone: '0521234567', email: 'test1@example.com' },
      { firstName: 'Test', lastName: 'User 2', phone: '0521234568', email: 'test2@example.com' },
      { firstName: 'Test', lastName: 'User 3', phone: '0521234569', email: 'test3@example.com' }
    ];

    const participantPromises = participants.map(async (participant) => {
      const { data, error } = await supabase
        .from('participants')
        .insert({
          first_name: participant.firstName,
          last_name: participant.lastName,
          phone: participant.phone,
          email: participant.email,
          organization_id: organization.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    });

    const createdParticipants = await Promise.all(participantPromises);
    console.log('✅ Created test participants:', createdParticipants.map(p => p.id));

    // 4. Link participants to event
    const eventParticipantPromises = createdParticipants.map(async (participant) => {
      const { data, error } = await supabase
        .from('event_participants')
        .insert({
          event_id: event.id,
          participant_id: participant.id,
          status: 'confirmed'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    });

    await Promise.all(eventParticipantPromises);
    console.log('✅ Linked participants to event');

    // 5. Create personal schedules for participants
    const schedulePromises = createdParticipants.map(async (participant, index) => {
      const scheduleData = {
        event_id: event.id,
        participant_id: participant.id,
        sessions: [
          {
            name: 'Test Session 1',
            start_time: new Date(futureDate.getTime() + index * 30 * 60 * 1000).toISOString(), // 30 min apart
            end_time: new Date(futureDate.getTime() + (index + 1) * 30 * 60 * 1000).toISOString(),
            location: 'Test Room ' + (index + 1)
          }
        ]
      };

      const { data, error } = await supabase
        .from('schedules')
        .insert(scheduleData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    });

    const createdSchedules = await Promise.all(schedulePromises);
    console.log('✅ Created personal schedules for participants');

    // 6. Verify the setup
    console.log('\n📋 Test Event Summary:');
    console.log('-------------------');
    console.log('Event ID:', event.id);
    console.log('Event Name:', event.name);
    console.log('Event Date:', event.start_date);
    console.log('Organization ID:', organization.id);
    console.log('Reminder Settings:', JSON.stringify(event.settings.reminders, null, 2));
    console.log('\nParticipants created:', createdParticipants.length);
    console.log('Schedules created:', createdSchedules.length);

    console.log('\n🎉 Test event created successfully!');
    console.log('Use this event ID for UI testing:', event.id);

  } catch (error) {
    console.error('❌ Error creating test event:', error);
    process.exit(1);
  }
}

// Run the script
createTestEvent();