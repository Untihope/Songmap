import { db } from './database'
import type { WorkspaceState } from '../../domain/models'

export const deviceClass = (): WorkspaceState['deviceClass'] => innerWidth < 640 ? 'phone' : innerWidth < 1024 ? 'tablet' : 'desktop'
export const workspaceId = (projectId: string) => projectId + ':' + deviceClass()
export async function saveWorkspace(projectId: string, changes: Partial<WorkspaceState>) {
  const id = workspaceId(projectId)
  await db.transaction('rw', db.workspaceStates, async () => {
    const previous = await db.workspaceStates.get(id)
    await db.workspaceStates.put({ ...previous, ...changes, id, projectId, deviceClass: deviceClass() })
  })
}
