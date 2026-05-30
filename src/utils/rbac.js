import { PrismaClient } from '@prisma/client';

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

// Default Static Fallback Permission Matrix
const DEFAULT_PERMISSIONS = {
  SUPER_ADMIN: {
    USER: ['CREATE', 'UPDATE', 'DELETE', 'SUSPEND'],
    STRATEGY: ['CREATE', 'ACTIVATE', 'DISABLE'],
    BILLING: ['VIEW', 'MODIFY'],
    SYSTEM: ['MAINTENANCE', 'KILL_SWITCH']
  },
  ADMIN: {
    USER: ['CREATE', 'UPDATE', 'SUSPEND'],
    STRATEGY: ['CREATE', 'ACTIVATE', 'DISABLE'],
    BILLING: ['VIEW', 'MODIFY'],
    SYSTEM: ['MAINTENANCE']
  },
  ANALYST: {
    USER: [],
    STRATEGY: ['CREATE', 'ACTIVATE'],
    BILLING: ['VIEW'],
    SYSTEM: []
  },
  MEMBER: {
    USER: [],
    STRATEGY: [],
    BILLING: ['VIEW'],
    SYSTEM: []
  },
  VIEWER: {
    USER: [],
    STRATEGY: [],
    BILLING: ['VIEW'],
    SYSTEM: []
  }
};

/**
 * Checks if a user role has the required permission for a resource and action.
 * @param {string} role - The role of the user (e.g. SUPER_ADMIN, ADMIN)
 * @param {string} resource - The target resource (e.g. USER, STRATEGY)
 * @param {string} action - The target action (e.g. CREATE, UPDATE)
 * @returns {Promise<boolean>} - True if permission is granted
 */
export async function checkPermission(role, resource, action) {
  if (!role || !resource || !action) return false;

  const normalizedRole = role.toUpperCase();
  const normalizedResource = resource.toUpperCase();
  const normalizedAction = action.toUpperCase();

  try {
    // 1. Check database for dynamic overrides
    const dbPermission = await prisma.rolePermission.findFirst({
      where: {
        role: normalizedRole,
        resource: normalizedResource,
        action: normalizedAction
      }
    });

    if (dbPermission) {
      return true;
    }

    // 2. Fallback to default structural matrix
    const rolePermissions = DEFAULT_PERMISSIONS[normalizedRole];
    if (rolePermissions && rolePermissions[normalizedResource]) {
      return rolePermissions[normalizedResource].includes(normalizedAction);
    }

    return false;
  } catch (error) {
    console.error('RBAC Permission Check Error:', error);
    // Safe fallback to default static permissions
    const rolePermissions = DEFAULT_PERMISSIONS[normalizedRole];
    if (rolePermissions && rolePermissions[normalizedResource]) {
      return rolePermissions[normalizedResource].includes(normalizedAction);
    }
    return false;
  }
}

/**
 * Seed default permissions into the database for lookup
 */
export async function seedPermissions() {
  try {
    const permissionsToSeed = [];
    for (const [role, resources] of Object.entries(DEFAULT_PERMISSIONS)) {
      for (const [resource, actions] of Object.entries(resources)) {
        for (const action of actions) {
          permissionsToSeed.push({ role, resource, action });
        }
      }
    }

    // Check if seeded
    const count = await prisma.rolePermission.count();
    if (count === 0) {
      await prisma.rolePermission.createMany({
        data: permissionsToSeed,
        skipDuplicates: true
      });
      console.log('Successfully seeded standard role permissions in DB');
    }
  } catch (error) {
    console.error('Failed to seed default role permissions:', error);
  }
}
