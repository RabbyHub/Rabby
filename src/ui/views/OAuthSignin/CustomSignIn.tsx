import { useSignIn } from '@clerk/chrome-extension';
import type { OAuthStrategy } from '@clerk/types';

export default function SignInCustomPage() {
  // const router = useRouter();
  const { signIn } = useSignIn();
  // const [lastUsed, setLastUsed] = useLastUsed();

  if (!signIn) return null;

  const signInWith = (strategy: OAuthStrategy) => {
    return signIn
      .authenticateWithRedirect({
        strategy,
        redirectUrl: 'https://feedbacks-rr.vercel.app/',
        redirectUrlComplete: 'https://feedbacks-rr.vercel.app/app',
      })
      .then((res) => {
        console.log('sign in custom', res);
        // chrome.tabs.
        // setLastUsed("google");
      })
      .catch((err: any) => {
        // See https://clerk.com/docs/custom-flows/error-handling
        // for more info on error handling
        // console.log(err.errors);
        // console.error(err, null, 2);
      });
  };

  return (
    <section
      className={
        'relative flex flex-col justify-center items-center gap-y-4 h-dvh w-full'
      }
    >
      <div className={'absolute top-8 py-2'}>
        <div className={'flex flex-col items-center gap-x-1'}>
          {/*<FeedbacksLogo size={32} />*/}
          <p className="font-bold text-inherit">Welcome to WalletPro</p>
        </div>
        {/*<div className={"text-lg text-balance"}>
          <span className={"text-small font-semibold"}>Sign in using your</span>
          <span className={"font-medium"}>Social Accounts</span>
        </div>*/}
      </div>
      <div className={'flex flex-row justify-center items-center gap-3'}>
        {/*<Button*/}
        {/*  className={"font-semibold"}*/}
        {/*  size={"md"}*/}
        {/*  variant={"flat"}*/}
        {/*  onPress={() => signInWith("oauth_google")}*/}
        {/*>*/}
        {/*  /!*<Icons.google className="mr-2 h-4 w-4" />*!/*/}
        {/*  <GoogleLogo size={16} />*/}
        {/*  Sign in with Google*/}
        {/*  /!*{lastUsed === "google" ? <LastUsed /> : null}*!/*/}
        {/*</Button>*/}

        <button onClick={() => signInWith('oauth_google')}>
          Sign in with google
        </button>
      </div>

      {/*<div className={"absolute bottom-8 w-full"}>
        <Divider className={"mx-auto my-4 w-9/12 lg:w-4/12 bg-default-100"} />
        <div
          className={
            "font-bold text-2xl text-center underline underline-offset-2"
          }
        >
          <Button
            className={"font-semibold"}
            variant={"light"}
            onPress={() => router.replace("/app")}
          >
            Back to app
          </Button>
        </div>
      </div>*/}
    </section>
  );
}
