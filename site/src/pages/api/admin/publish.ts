import type { APIRoute } from 'astro';
import { serverEnv } from '../../../lib/env';
import { json, requireStaff, isResponse } from '../../../lib/admin-api';

export const prerender = false;

/**
 * Triggers a site rebuild.
 *
 * Public pages are prerendered, so anything baked in at build time -- contact
 * details, social links, whether an image slot is filled -- only reaches the
 * live site after a rebuild. This lets staff publish without a developer.
 *
 * Deliberately not automatic on every save: an editor correcting four fields
 * would otherwise queue four builds. They press Publish when they are done.
 *
 * TWO TRIGGERS, because the obvious one does not exist here. A "deploy hook"
 * -- a URL you POST to with no credentials -- is a Cloudflare *Pages* feature.
 * This site deploys as a Worker from GitHub Actions, so the real trigger is
 * GitHub's workflow_dispatch API, which needs an Authorization header, an
 * Accept header, a User-Agent and a JSON body. The original bare POST could
 * never have worked against it.
 *
 * GitHub is tried first; CF_DEPLOY_HOOK remains supported so moving to Pages
 * later is a configuration change rather than a code change.
 */

const GITHUB_API = 'https://api.github.com';

type Trigger = { ok: true } | { ok: false; status: number; detail: string };

async function dispatchGitHub(
  repo: string,
  token: string,
  workflow: string,
  ref: string,
): Promise<Trigger> {
  const url = `${GITHUB_API}/repos/${repo}/actions/workflows/${workflow}/dispatches`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      // GitHub rejects API requests with no User-Agent.
      'user-agent': 'alicore-site-admin',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ ref }),
  });

  // A successful dispatch is 204 No Content.
  if (res.status === 204) return { ok: true };

  const detail = await res.text().catch(() => '');
  return { ok: false, status: res.status, detail: detail.slice(0, 500) };
}

export const POST: APIRoute = async (context) => {
  const staff = await requireStaff(context);
  if (isResponse(staff)) return staff;

  const env = (key: string) => serverEnv(context.locals, key);

  const repo = env('GITHUB_REPO');
  const token = env('GITHUB_DISPATCH_TOKEN');
  const hook = env('CF_DEPLOY_HOOK');

  if (!repo && !token && !hook) {
    // Lead with the fact that matters: nothing was lost.
    return json(
      {
        error:
          'Your changes are saved, but this site is not yet connected to its ' +
          'publishing service, so it cannot rebuild itself. The changes will ' +
          'appear the next time the site is built. (Developer: set ' +
          'GITHUB_REPO and GITHUB_DISPATCH_TOKEN.)',
      },
      501,
    );
  }

  try {
    if (repo && token) {
      const result = await dispatchGitHub(
        repo,
        token,
        env('GITHUB_WORKFLOW') || 'deploy.yml',
        env('GITHUB_BRANCH') || 'main',
      );

      if (!result.ok) {
        // These three are the ones a misconfiguration actually produces, and
        // each needs a different fix -- so name the fix rather than the code.
        console.error('[admin/publish] github dispatch failed', result.status, result.detail);
        const reason =
          result.status === 401 || result.status === 403
            ? 'the publishing token was rejected — it may have expired or lack Actions: write'
            : result.status === 404
              ? 'the deploy workflow could not be found — check GITHUB_REPO and GITHUB_WORKFLOW'
              : `the publishing service returned ${result.status}`;
        return json(
          { error: `Your changes are saved, but ${reason}. Please tell your developer.` },
          502,
        );
      }

      return json({ ok: true, via: 'github' });
    }

    // Pages-style hook: an unauthenticated POST is the whole contract.
    const res = await fetch(hook!, { method: 'POST' });
    if (!res.ok) throw new Error(`deploy hook returned ${res.status}`);
    return json({ ok: true, via: 'hook' });
  } catch (err) {
    console.error('[admin/publish] rebuild trigger failed', err);
    return json(
      { error: 'Your changes are saved, but the rebuild could not be started. Please try again.' },
      502,
    );
  }
};
