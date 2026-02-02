/**
 * Devserver Router API - HTTP API for devserver task execution
 * Phase 33, Task 7
 */

export async function handleRun(req, res, ctx = {}) {
  if (ctx.requireAuth && !req.headers?.authorization) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { provider, prompt } = req.body || {};
  if (!provider || !prompt) {
    return res.status(400).json({ error: 'provider and prompt required' });
  }

  const taskId = ctx.queue?.enqueue({ provider, prompt }) || 'task-' + Date.now();
  res.json({ taskId });
}

export async function handleTask(req, res, ctx = {}) {
  const { taskId } = req.params;
  const task = ctx.queue?.getTask(taskId) || { status: 'unknown' };
  res.json(task);
}

export async function handleReview(req, res, ctx = {}) {
  const { code } = req.body;
  const providers = ctx.providers || ['claude'];
  const results = [];

  for (const provider of providers) {
    const result = await ctx.runProvider(provider, { prompt: 'Review: ' + code });
    results.push(result.parsed);
  }

  const scores = results.map(r => r?.score || 0);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const approved = results.filter(r => r?.approved).length > results.length / 2;

  res.json({ results, consensus: { score: avgScore, approved } });
}

export async function handleDesign(req, res, ctx = {}) {
  const { description } = req.body;
  const result = await ctx.runProvider('gemini', { prompt: 'Design: ' + description });
  res.json(result.parsed || {});
}

export async function handleHealth(req, res, ctx = {}) {
  const providers = ctx.getProviderStatus?.() || {};
  res.json({ status: 'ok', providers });
}

export default { handleRun, handleTask, handleReview, handleDesign, handleHealth };
