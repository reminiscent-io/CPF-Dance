import { describe, it, expect } from 'vitest'
import {
  hasInstructorPrivileges,
  hasDancerPrivileges,
  hasAdminPrivileges,
  canAccessInstructorPortal,
  canAccessDancerPortal,
  canManageClasses,
  canManageStudents,
  canManagePayments,
  canManageNotes,
  canManageStudios,
  canManageWaivers,
  isInstructorOrAdmin,
  isDancerOrAdmin
} from '../privileges'

describe('privileges', () => {
  describe('hasInstructorPrivileges', () => {
    it('should return true for instructor role', () => {
      expect(hasInstructorPrivileges({ role: 'instructor' })).toBe(true)
    })

    it('should return true for admin role (admin override)', () => {
      expect(hasInstructorPrivileges({ role: 'admin' })).toBe(true)
    })

    it('should return false for dancer role', () => {
      expect(hasInstructorPrivileges({ role: 'dancer' })).toBe(false)
    })

    it('should return false for guardian role', () => {
      expect(hasInstructorPrivileges({ role: 'guardian' })).toBe(false)
    })

    it('should return false for null profile', () => {
      expect(hasInstructorPrivileges(null)).toBe(false)
    })

    it('should return false for undefined profile', () => {
      expect(hasInstructorPrivileges(undefined)).toBe(false)
    })

    it('should return false for unknown role', () => {
      expect(hasInstructorPrivileges({ role: 'unknown' })).toBe(false)
    })
  })

  describe('hasDancerPrivileges', () => {
    it('should return true for dancer role', () => {
      expect(hasDancerPrivileges({ role: 'dancer' })).toBe(true)
    })

    it('should return true for guardian role', () => {
      expect(hasDancerPrivileges({ role: 'guardian' })).toBe(true)
    })

    it('should return true for admin role (admin override)', () => {
      expect(hasDancerPrivileges({ role: 'admin' })).toBe(true)
    })

    it('should return false for instructor role', () => {
      expect(hasDancerPrivileges({ role: 'instructor' })).toBe(false)
    })

    it('should return false for null profile', () => {
      expect(hasDancerPrivileges(null)).toBe(false)
    })

    it('should return false for undefined profile', () => {
      expect(hasDancerPrivileges(undefined)).toBe(false)
    })

    it('should return false for unknown role', () => {
      expect(hasDancerPrivileges({ role: 'unknown' })).toBe(false)
    })
  })

  describe('hasAdminPrivileges', () => {
    it('should return true for admin role', () => {
      expect(hasAdminPrivileges({ role: 'admin' })).toBe(true)
    })

    it('should return false for instructor role', () => {
      expect(hasAdminPrivileges({ role: 'instructor' })).toBe(false)
    })

    it('should return false for dancer role', () => {
      expect(hasAdminPrivileges({ role: 'dancer' })).toBe(false)
    })

    it('should return false for guardian role', () => {
      expect(hasAdminPrivileges({ role: 'guardian' })).toBe(false)
    })

    it('should return false for null profile', () => {
      expect(hasAdminPrivileges(null)).toBe(false)
    })

    it('should return false for undefined profile', () => {
      expect(hasAdminPrivileges(undefined)).toBe(false)
    })
  })

  describe('canAccessInstructorPortal', () => {
    it('should return true for instructor role', () => {
      expect(canAccessInstructorPortal({ role: 'instructor' })).toBe(true)
    })

    it('should return true for admin role', () => {
      expect(canAccessInstructorPortal({ role: 'admin' })).toBe(true)
    })

    it('should return false for dancer role', () => {
      expect(canAccessInstructorPortal({ role: 'dancer' })).toBe(false)
    })

    it('should return false for guardian role', () => {
      expect(canAccessInstructorPortal({ role: 'guardian' })).toBe(false)
    })

    it('should return false for null profile', () => {
      expect(canAccessInstructorPortal(null)).toBe(false)
    })
  })

  describe('canAccessDancerPortal', () => {
    it('should return true for dancer role', () => {
      expect(canAccessDancerPortal({ role: 'dancer' })).toBe(true)
    })

    it('should return true for guardian role', () => {
      expect(canAccessDancerPortal({ role: 'guardian' })).toBe(true)
    })

    it('should return true for admin role', () => {
      expect(canAccessDancerPortal({ role: 'admin' })).toBe(true)
    })

    it('should return false for instructor role', () => {
      expect(canAccessDancerPortal({ role: 'instructor' })).toBe(false)
    })

    it('should return false for null profile', () => {
      expect(canAccessDancerPortal(null)).toBe(false)
    })
  })

  describe('canManageClasses', () => {
    it('should return true for instructor role', () => {
      expect(canManageClasses({ role: 'instructor' })).toBe(true)
    })

    it('should return true for admin role', () => {
      expect(canManageClasses({ role: 'admin' })).toBe(true)
    })

    it('should return false for dancer role', () => {
      expect(canManageClasses({ role: 'dancer' })).toBe(false)
    })

    it('should return false for null profile', () => {
      expect(canManageClasses(null)).toBe(false)
    })
  })

  describe('canManageStudents', () => {
    it('should return true for instructor role', () => {
      expect(canManageStudents({ role: 'instructor' })).toBe(true)
    })

    it('should return true for admin role', () => {
      expect(canManageStudents({ role: 'admin' })).toBe(true)
    })

    it('should return false for dancer role', () => {
      expect(canManageStudents({ role: 'dancer' })).toBe(false)
    })

    it('should return false for null profile', () => {
      expect(canManageStudents(null)).toBe(false)
    })
  })

  describe('canManagePayments', () => {
    it('should return true for instructor role', () => {
      expect(canManagePayments({ role: 'instructor' })).toBe(true)
    })

    it('should return true for admin role', () => {
      expect(canManagePayments({ role: 'admin' })).toBe(true)
    })

    it('should return false for dancer role', () => {
      expect(canManagePayments({ role: 'dancer' })).toBe(false)
    })

    it('should return false for null profile', () => {
      expect(canManagePayments(null)).toBe(false)
    })
  })

  describe('canManageNotes', () => {
    it('should return true for instructor role', () => {
      expect(canManageNotes({ role: 'instructor' })).toBe(true)
    })

    it('should return true for admin role', () => {
      expect(canManageNotes({ role: 'admin' })).toBe(true)
    })

    it('should return false for dancer role', () => {
      expect(canManageNotes({ role: 'dancer' })).toBe(false)
    })

    it('should return false for null profile', () => {
      expect(canManageNotes(null)).toBe(false)
    })
  })

  describe('canManageStudios', () => {
    it('should return true for instructor role', () => {
      expect(canManageStudios({ role: 'instructor' })).toBe(true)
    })

    it('should return true for admin role', () => {
      expect(canManageStudios({ role: 'admin' })).toBe(true)
    })

    it('should return false for dancer role', () => {
      expect(canManageStudios({ role: 'dancer' })).toBe(false)
    })

    it('should return false for null profile', () => {
      expect(canManageStudios(null)).toBe(false)
    })
  })

  describe('canManageWaivers', () => {
    it('should return true for instructor role', () => {
      expect(canManageWaivers({ role: 'instructor' })).toBe(true)
    })

    it('should return true for admin role', () => {
      expect(canManageWaivers({ role: 'admin' })).toBe(true)
    })

    it('should return false for dancer role', () => {
      expect(canManageWaivers({ role: 'dancer' })).toBe(false)
    })

    it('should return false for null profile', () => {
      expect(canManageWaivers(null)).toBe(false)
    })
  })

  describe('isInstructorOrAdmin', () => {
    it('should return true for instructor role', () => {
      expect(isInstructorOrAdmin('instructor')).toBe(true)
    })

    it('should return true for admin role', () => {
      expect(isInstructorOrAdmin('admin')).toBe(true)
    })

    it('should return false for dancer role', () => {
      expect(isInstructorOrAdmin('dancer')).toBe(false)
    })

    it('should return false for guardian role', () => {
      expect(isInstructorOrAdmin('guardian')).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isInstructorOrAdmin(undefined)).toBe(false)
    })

    it('should return false for unknown role', () => {
      expect(isInstructorOrAdmin('unknown')).toBe(false)
    })
  })

  describe('isDancerOrAdmin', () => {
    it('should return true for dancer role', () => {
      expect(isDancerOrAdmin('dancer')).toBe(true)
    })

    it('should return true for guardian role', () => {
      expect(isDancerOrAdmin('guardian')).toBe(true)
    })

    it('should return true for admin role', () => {
      expect(isDancerOrAdmin('admin')).toBe(true)
    })

    it('should return false for instructor role', () => {
      expect(isDancerOrAdmin('instructor')).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isDancerOrAdmin(undefined)).toBe(false)
    })

    it('should return false for unknown role', () => {
      expect(isDancerOrAdmin('unknown')).toBe(false)
    })
  })

  describe('admin override consistency', () => {
    const adminProfile = { role: 'admin' }

    it('admin should have all instructor privileges', () => {
      expect(hasInstructorPrivileges(adminProfile)).toBe(true)
      expect(canAccessInstructorPortal(adminProfile)).toBe(true)
      expect(canManageClasses(adminProfile)).toBe(true)
      expect(canManageStudents(adminProfile)).toBe(true)
      expect(canManagePayments(adminProfile)).toBe(true)
      expect(canManageNotes(adminProfile)).toBe(true)
      expect(canManageStudios(adminProfile)).toBe(true)
      expect(canManageWaivers(adminProfile)).toBe(true)
    })

    it('admin should have all dancer privileges', () => {
      expect(hasDancerPrivileges(adminProfile)).toBe(true)
      expect(canAccessDancerPortal(adminProfile)).toBe(true)
    })

    it('admin should have admin privileges', () => {
      expect(hasAdminPrivileges(adminProfile)).toBe(true)
    })
  })

  describe('role isolation', () => {
    it('instructor should not have dancer portal access', () => {
      const instructorProfile = { role: 'instructor' }
      expect(canAccessDancerPortal(instructorProfile)).toBe(false)
      expect(hasDancerPrivileges(instructorProfile)).toBe(false)
    })

    it('dancer should not have instructor privileges', () => {
      const dancerProfile = { role: 'dancer' }
      expect(canAccessInstructorPortal(dancerProfile)).toBe(false)
      expect(hasInstructorPrivileges(dancerProfile)).toBe(false)
      expect(canManageClasses(dancerProfile)).toBe(false)
      expect(canManageStudents(dancerProfile)).toBe(false)
      expect(canManagePayments(dancerProfile)).toBe(false)
    })

    it('guardian should have dancer privileges but not instructor privileges', () => {
      const guardianProfile = { role: 'guardian' }
      expect(hasDancerPrivileges(guardianProfile)).toBe(true)
      expect(canAccessDancerPortal(guardianProfile)).toBe(true)
      expect(hasInstructorPrivileges(guardianProfile)).toBe(false)
      expect(canAccessInstructorPortal(guardianProfile)).toBe(false)
    })
  })
})
