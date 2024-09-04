import { getSession } from 'next-auth/react';

export async function getServerSideProps(context) {
  const session = await getSession(context);
  return {
    props: {
      session,
    },
  };
}

export default function Page({ session }) {
  return (
    <div>
      <h1>Welcome, {session.user.name}</h1>
    </div>
  );
}