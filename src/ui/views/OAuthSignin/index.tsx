import { ClerkProvider, SignIn } from '@clerk/chrome-extension';
import type { OAuthStrategy } from '@clerk/types';
import SignInCustomPage from './CustomSignIn';
// import SignInCustomPage from '../features/custom-sign-in';

const PUBLISHABLE_KEY = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY;

// if (!PUBLISHABLE_KEY) {
//   throw new Error(
//     'Please add the PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY to the .env.development file'
//   );
// }

function OAuthSignInPage() {
  // const navigate = useNavigate()
  /*const { signIn } = useSignIn();
  // const [lastUsed, setLastUsed] = useLastUsed();

  if (!signIn) return null;

  const signInWith = (strategy: OAuthStrategy) => {
    return signIn
      .authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      })
      .then((res) => {
        // console.log(res);
        // setLastUsed("google");
      })
      .catch((err: any) => {
        // See https://clerk.com/docs/custom-flows/error-handling
        // for more info on error handling
        // console.log(err.errors);
        // console.error(err, null, 2);
      });
  };
  */

  return (
    // <ClerkProvider
    //   // routerPush={(to) => navigate(to)}
    //   // routerReplace={(to) => navigate(to, { replace: true })}
    //   // publishableKey={PUBLISHABLE_KEY}
    //   publishableKey={
    //     'pk_test_ZGl2ZXJzZS1tb25hcmNoLTc3LmNsZXJrLmFjY291bnRzLmRldiQ'
    //   }
    //   afterSignOutUrl="/"
    // >
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 16,
      }}
    >
      <h2>Delta Flyer Tab</h2>

      <p>This tab is only available on the Delta Flyer page.</p>

      <SignIn routing="virtual" />
      {/*chrome-extension://jcnceknecgphjomodfcphbcgokhlnmeh/tabs/oauth-sign-in.html*/}
      {/*<button onClick={() => signInWith("oauth_google")}>Sign in with google</button>*/}

      <SignInCustomPage />
    </div>
    // </ClerkProvider>
  );
}

export default OAuthSignInPage;
