/**
 * DEPRECATED: 다중 프로필 도입으로 참여 CRUD는 /api/participations (index.ts)에서 처리한다.
 * 이 파일은 남겨두면 vite dev middleware가 dynamic segment로 매칭할 수 있어 즉시 410으로 응답한다.
 * TODO: 다음 정리 iteration에서 파일 자체를 삭제.
 */
import type {VercelRequest, VercelResponse} from '@vercel/node'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(410).json({error: 'endpoint removed', hint: 'use PUT /api/participations with body.profileId'})
}
