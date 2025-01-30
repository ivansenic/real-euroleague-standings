import Link from "next/link";

export const metadata = {
  title: "Privacy Policy - Real EuroLeague Standings",
  robots: "noindex, nofollow",
};

export default async function PrivacyPolicy() {
  return (
    <div className="overflow-auto min-h-screen p-4 pb-20 gap-16 sm:px-20 sm:p-8 font-[family-name:var(--font-geist-sans)]">
      <main>
        <h1 className="text-lg font-semibold text-white mb-8">
          Privacy Policy
        </h1>
        <section className="flex flex-col gap-4">
          <p>
            Thank you for using our website. This page provides information
            regarding how we handle data and display advertisements.
          </p>

          <h2 className="font-semibold">Use of Google AdSense</h2>
          <p>
            We display Google AdSense advertisements on this website. Google may
            use cookies to serve ads based on your prior visits to this or other
            websites. Google’s use of advertising cookies enables it and its
            partners to serve ads to our users based on their visit to our site
            and/or other sites on the Internet.
          </p>

          <p>
            You may opt out of personalized advertising by visiting
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="underline ml-1"
            >
              Google Ads Settings
            </a>
            . Alternatively, you can opt out of a third-party vendor’s use of
            cookies by visiting the
            <a
              href="https://youradchoices.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline ml-1"
            >
              YourAdChoices
            </a>{" "}
            website.
          </p>

          <h2 className="font-semibold">Data Collection</h2>
          <p>
            We do not collect personal data beyond what is necessary for
            displaying standings and serving ads. Any data collected by Google
            is governed by Google’s own privacy policies. We encourage you to
            review
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline ml-1"
            >
              Google’s Privacy Policy
            </a>{" "}
            for more details.
          </p>

          <h2 className="font-semibold">Changes</h2>
          <p>
            We may update this policy from time to time by posting a new version
            on this page. Your continued use of the website after changes
            indicates your acceptance of the revised policy.
          </p>
        </section>
      </main>

      <footer className="pt-8 flex flex-col flex-wrap gap-1 items-center justify-center text-gray-500">
        <div>
          <p>
            {`Copyright © ${new Date().getFullYear()} ISE ENGINEERING LIMITED.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            className="underline hover:no-underline hover:text-gray-400"
          >
            Back
          </Link>
        </div>
      </footer>
    </div>
  );
}
