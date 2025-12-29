import { WorkspaceMember } from './api';

/**
 * 모든 멤버 반환 (status 필드 제거됨)
 */
export function filterActiveMembers(members: WorkspaceMember[]): WorkspaceMember[] {
    return members;
}

/**
 * PENDING 멤버 필터링 (더 이상 사용되지 않음)
 * @deprecated status 필드가 제거되어 항상 빈 배열 반환
 */
export function filterPendingMembers(members: WorkspaceMember[]): WorkspaceMember[] {
    return [];
}

/**
 * LEFT 멤버 필터링 (더 이상 사용되지 않음)
 * @deprecated status 필드가 제거되어 항상 빈 배열 반환
 */
export function filterLeftMembers(members: WorkspaceMember[]): WorkspaceMember[] {
    return [];
}
