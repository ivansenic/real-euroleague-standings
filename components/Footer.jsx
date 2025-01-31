const Footer = () => {
  return (
    <footer className="pt-8 flex flex-col flex-wrap gap-1 items-center justify-center text-gray-500">
      <div>
        <p className="text-center">
          {`Copyright © ${new Date().getFullYear()} ISE ENGINEERING LIMITED DOO.`}
        </p>
      </div>
      <div className="flex gap-2">
        <a
          href="https://github.com/ivansenic/real-euroleague-standings"
          target="_blank"
          rel="noreferrer"
          className="underline hover:no-underline hover:text-gray-400"
        >
          View on GitHub
        </a>
        <span>|</span>
        <Link
          href="/privacy-policy"
          className="underline hover:no-underline hover:text-gray-400"
        >
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
