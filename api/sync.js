export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const deployHook = process.env.VERCEL_DEPLOY_HOOK || process.env.VITE_VERCEL_DEPLOY_HOOK;

    if (!deployHook) {
        return res.status(500).json({ error: 'Deploy hook not configured' });
    }

    try {
        const response = await fetch(deployHook, {
            method: 'POST',
        });

        if (!response.ok) {
            throw new Error(`Vercel responded with ${response.status}`);
        }

        const data = await response.json();
        return res.status(200).json({ message: 'Sync triggered successfully', data });
    } catch (error) {
        console.error('Error triggering sync:', error);
        return res.status(500).json({ error: 'Failed to trigger site sync', details: error.message });
    }
}
