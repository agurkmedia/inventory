import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Providers } from "./providers";
import AnimatedLayout from "@/components/AnimatedLayout";
import ClientSessionProvider from "@/components/ClientSessionProvider";
import "./globals.css";

const poppins = Poppins({ 
  weight: ['400', '600', '700'],
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Inventory App",
  description: "Manage your inventory with ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.className} antialiased`}>
        <ClientSessionProvider>
          <Providers>
            <AnimatedLayout>{children}</AnimatedLayout>
          </Providers>
        </ClientSessionProvider>
      </body>
    </html>
  );
}
