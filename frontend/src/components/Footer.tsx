import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-surface py-6 text-center border-t border-border mt-auto mb-16 md:mb-0">
      <p className="text-muted text-sm">© {new Date().getFullYear()} WanderAI. All rights reserved.</p>
    </footer>
  );
};

export default Footer;
