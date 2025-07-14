import {
  SignedIn,
  SignedOut,
  SignOutButton,
  useUser,
} from '@clerk/chrome-extension';
import { Avatar, Button, DropdownMenu, Text } from '@radix-ui/themes';
// import { useWalletContext } from '~context';
import { Link, useHistory } from 'react-router-dom';
import { toast } from 'sonner';
import { openInternalPageInTab, useWallet } from 'ui/utils';

export default function ProfileDropdown() {
  // const { data: session } = useSession();
  // const { lockWallet } = useWalletContext();
  const { lockWallet } = useWallet();
  const { user } = useUser();
  const history = useHistory();

  const handleSignin = async () => {
    // await chrome.runtime.sendMessage({ type: 'oauth-login' });
    // signIn("google", { redirect: true});

    // Redirect to the tabs page to handle the OAuth flow.
    // await chrome.tabs.create({
    //   url: './tabs/oauth-sign-in.html',
    // });

    openInternalPageInTab('oauth-signin');

    toast('signin redirect has been triggered.');

    // chrome.identity.getAuthToken({ interactive: true }, (token) => {
    //   if (chrome.runtime.lastError) {
    //     console.error(chrome.runtime.lastError.message);
    //   } else {
    //     console.log("Access Token: ", token);
    //     // signIn("google", { redirect: true });
    //   }
    // });
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button asChild variant="soft" radius={'full'} style={{ padding: 0 }}>
          <Avatar
            size="3"
            src={
              user?.imageUrl ||
              'https://api.dicebear.com/9.x/big-smile/svg?hair=curlyShortHair&mouth=openedSmile&eyes=normal&accessories=glasses'
            }
            fallback="ME"
            radius="full"
            style={{ padding: '2px', border: '2px solid #444444' }}
          />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {/* @ts-expect-error "This is negligible" */}
        <SignedIn>
          <>
            <DropdownMenu.Item onClick={() => history.push('/profile')}>
              <Text weight={'bold'}>{user?.fullName}</Text>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              color={'red'}
              shortcut="⌘ U"
              // onClick={() => signOut()}
            >
              <Button asChild variant={'ghost'}>
                <SignOutButton />
              </Button>
            </DropdownMenu.Item>
          </>
        </SignedIn>
        {/* @ts-expect-error "This is negligible" */}
        <SignedOut>
          <>
            <DropdownMenu.Item shortcut="⌘ E" onClick={handleSignin}>
              <Text>Signin</Text>
            </DropdownMenu.Item>
          </>
        </SignedOut>
        <DropdownMenu.Separator />
        <DropdownMenu.Item shortcut="⌘ N">Archive</DropdownMenu.Item>

        <DropdownMenu.Separator />
        <DropdownMenu.Item>Share</DropdownMenu.Item>
        <DropdownMenu.Item>Add to favorites</DropdownMenu.Item>
        <DropdownMenu.Item
          shortcut={''}
          onClick={() => {
            lockWallet();
            toast('Wallet has been locked.');
          }}
        >
          Lock Wallet
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item shortcut="⌘ ⌫" color="red">
          Delete Account
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
