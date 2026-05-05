# WOR-32: Login / Register page

Added the `/login` page — a centered card UI where users authenticate via magic link (email) or Google OAuth. The page shows a "Check your email" confirmation after sending a magic link, displays inline validation errors below the email input, and includes Terms and Privacy Policy links. After successful authentication, users are redirected to `/dashboard` or back to a pending invite URL if one was stashed before login.
