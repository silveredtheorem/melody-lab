import { prisma } from '../lib/prisma'
import { Prisma } from '../../generated/prisma/client'

export async function findLCA(
  branchAHeadId: string,
  branchBHeadId: string
): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    WITH RECURSIVE
      ancestors_a AS (
        SELECT id, "parentId", "createdAt"
        FROM "Commit"
        WHERE id = ${branchAHeadId}
        UNION ALL
        SELECT c.id, c."parentId", c."createdAt"
        FROM "Commit" c
        INNER JOIN ancestors_a a ON c.id = a."parentId"
      ),
      ancestors_b AS (
        SELECT id, "parentId", "createdAt"
        FROM "Commit"
        WHERE id = ${branchBHeadId}
        UNION ALL
        SELECT c.id, c."parentId", c."createdAt"
        FROM "Commit" c
        INNER JOIN ancestors_b b ON c.id = b."parentId"
      )
    SELECT a.id
    FROM ancestors_a a
    INNER JOIN ancestors_b b ON a.id = b.id
    ORDER BY a."createdAt" DESC
    LIMIT 1
  `)

  return rows[0]?.id ?? null
}
