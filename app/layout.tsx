export const metadata = {
  title: "Stock Picks",
  description: "Daily dividend stock picks, scored and delivered.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
