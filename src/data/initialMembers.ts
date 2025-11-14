import { Member } from '../types';

export const INITIAL_MEMBERS: Omit<Member, 'id' | 'createdAt'>[] = [];

export function createInitialMembers(): Member[] {
  return [];
}