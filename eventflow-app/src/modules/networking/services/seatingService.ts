/**
 * Seating Service
 *
 * שירות לניהול שיבוץ משתתפים לשולחנות
 * CRUD operations for table_assignments table
 */

import { supabase } from '@/lib/supabase'
import type { TableAssignment } from '../types'

/**
 * קבל את כל השיבוצים לשולחנות עבור אירוע
 */
export async function fetchTableAssignments(
  eventId: string
): Promise<TableAssignment[]> {
  const { data, error } = await supabase
    .from('table_assignments')
    .select('*')
    .eq('event_id', eventId)
    .order('table_number', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch table assignments: ${error.message}`)
  }

  return data || []
}

/**
 * שמור או עדכן שיבוץ בודד לשולחן
 * Upsert operation - creates if doesn't exist, updates if exists
 */
export async function saveTableAssignment(
  assignment: Omit<TableAssignment, 'id' | 'assigned_at'> & {
    id?: string
  }
): Promise<TableAssignment> {
  const { data, error } = await supabase
    .from('table_assignments')
    .upsert({
      ...assignment,
      assigned_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save table assignment: ${error.message}`)
  }

  return data
}

/**
 * שמור את כל השיבוצים לשולחנות עבור אירוע
 * מוחק את השיבוצים הקיימים ויוצר חדשים
 */
export async function saveAllTableAssignments(
  eventId: string,
  assignments: Array<
    Omit<TableAssignment, 'id' | 'event_id' | 'assigned_at'>
  >
): Promise<TableAssignment[]> {
  // Delete existing assignments for this event
  const { error: deleteError } = await supabase
    .from('table_assignments')
    .delete()
    .eq('event_id', eventId)

  if (deleteError) {
    throw new Error(`Failed to delete existing assignments: ${deleteError.message}`)
  }

  // Insert new assignments
  const assignmentsToInsert = assignments.map((assignment) => ({
    ...assignment,
    event_id: eventId,
    assigned_at: new Date().toISOString(),
  }))

  const { data, error } = await supabase
    .from('table_assignments')
    .insert(assignmentsToInsert)
    .select()

  if (error) {
    throw new Error(`Failed to insert table assignments: ${error.message}`)
  }

  return data || []
}

/**
 * עדכן את מספר השולחן של משתתף (גרור ושחרר)
 */
export async function updateParticipantTable(
  eventId: string,
  participantId: string,
  newTableNumber: number,
  assignedBy: 'manager' | 'ai' | 'auto' = 'manager'
): Promise<TableAssignment> {
  // Check if assignment exists
  const { data: existing } = await supabase
    .from('table_assignments')
    .select('*')
    .eq('event_id', eventId)
    .eq('participant_id', participantId)
    .single()

  if (existing) {
    // Update existing assignment
    const { data, error } = await supabase
      .from('table_assignments')
      .update({
        table_number: newTableNumber,
        assigned_by: assignedBy,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update table assignment: ${error.message}`)
    }

    return data
  } else {
    // Create new assignment
    const { data, error } = await supabase
      .from('table_assignments')
      .insert({
        event_id: eventId,
        participant_id: participantId,
        table_number: newTableNumber,
        is_vip_table: false, // Will be updated by UI if needed
        assigned_by: assignedBy,
        assigned_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create table assignment: ${error.message}`)
    }

    return data
  }
}

/**
 * מחק שיבוץ לשולחן
 */
export async function deleteTableAssignment(
  assignmentId: string
): Promise<void> {
  const { error } = await supabase
    .from('table_assignments')
    .delete()
    .eq('id', assignmentId)

  if (error) {
    throw new Error(`Failed to delete table assignment: ${error.message}`)
  }
}

/**
 * מחק את כל השיבוצים עבור אירוע
 */
export async function deleteAllTableAssignments(
  eventId: string
): Promise<void> {
  const { error } = await supabase
    .from('table_assignments')
    .delete()
    .eq('event_id', eventId)

  if (error) {
    throw new Error(`Failed to delete all table assignments: ${error.message}`)
  }
}
