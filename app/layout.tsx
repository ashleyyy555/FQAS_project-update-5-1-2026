import React from 'react';
import './globals.css'; // Assuming you have a main app CSS file

export const metadata = {
  title: "App Dashboard",
  description: "Operations dashboard for the application.",

  icons:{
    icon: "/icon-v2.png",
  }

};

// The Root Layout component, which wraps the entire application
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
            {children}
        </div>
      </body>
    </html>
  );
}
