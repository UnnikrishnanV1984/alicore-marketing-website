import type { APIRoute } from 'astro';
import { clearSessionCookies } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = ({ cookies, redirect }) => {
  clearSessionCookies(cookies);
  return redirect('/admin', 302);
};
