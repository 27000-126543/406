import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '@/types';
import { userService } from '@/services/mock';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  users: User[];
}

interface AuthActions {
  login: (username: string, password: string, expectedRole?: UserRole) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: string | string[]) => boolean;
  isRole: (role: UserRole | UserRole[]) => boolean;
  fetchUsers: () => Promise<void>;
  clearError: () => void;
}

const rolePermissions: Record<UserRole, string[]> = {
  admin: ['all'],
  director: ['workorder:view', 'workorder:assign', 'workorder:transfer', 'device:view', 'device:manage', 'user:view', 'report:view'],
  engineer: ['workorder:view', 'workorder:accept', 'workorder:process', 'workorder:complete', 'device:view', 'device:maintenance'],
  nurse: ['workorder:create', 'workorder:view', 'device:view'],
  finance: ['report:view', 'inventory:view'],
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      error: null,
      users: [],

      login: async (username: string, password: string, expectedRole?: UserRole) => {
        set({ loading: true, error: null });
        try {
          const userWithoutRoleCheck = await userService.login(username, password);
          if (!userWithoutRoleCheck) {
            set({ error: '用户名或密码错误', loading: false });
            return false;
          }
          if (expectedRole && userWithoutRoleCheck.role !== expectedRole) {
            set({ error: '用户名、密码或角色不匹配，请检查后重试', loading: false });
            return false;
          }
          const token = btoa(`${userWithoutRoleCheck.id}:${Date.now()}`);
          set({ user: userWithoutRoleCheck, token, loading: false });
          return true;
        } catch (err) {
          set({ error: '登录失败，请稍后重试', loading: false });
          return false;
        }
      },

      logout: () => {
        set({ user: null, token: null, error: null });
        localStorage.removeItem('auth-storage');
      },

      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        if (user.role === 'admin') return true;
        
        const permissions = rolePermissions[user.role];
        const requiredPermissions = Array.isArray(permission) ? permission : [permission];
        
        return requiredPermissions.some(p => 
          permissions.includes(p) || permissions.includes('all')
        );
      },

      isRole: (role) => {
        const { user } = get();
        if (!user) return false;
        const roles = Array.isArray(role) ? role : [role];
        return roles.includes(user.role);
      },

      fetchUsers: async () => {
        set({ loading: true });
        try {
          const users = await userService.getAll();
          set({ users, loading: false });
        } catch {
          set({ error: '获取用户列表失败', loading: false });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);
