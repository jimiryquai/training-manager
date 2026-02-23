import type { AppContext } from '../worker';

export async function requireCoach({ ctx }: { ctx: AppContext }) {
    if (!ctx.session) {
        return new Response(null, { status: 302, headers: { Location: '/' } });
    }
    // In the future, we will verify role-based access control here
}
