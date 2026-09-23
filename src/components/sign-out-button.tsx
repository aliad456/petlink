export function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button type="submit" className="text-sm text-muted underline">
        התנתקות
      </button>
    </form>
  );
}
