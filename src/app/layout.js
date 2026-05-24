import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { getCurrentEmployee } from "@/lib/auth/currentEmployee";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "Production Bookings",
  description: "Photographer equipment and shoot bookings",
};

export default async function RootLayout({ children }) {
  const ctx = await getCurrentEmployee().catch(() => null);
  const signedIn = Boolean(ctx?.user);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('production_theme')||'dark';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){}})();",
          }}
        />
      </head>
      <body>
        <div className={`app-shell${signedIn ? "" : " no-sidebar"}`}>
          {signedIn ? (
            <Sidebar
              user={{ email: ctx.user.email }}
              employee={ctx.employee ?? null}
              roles={ctx.roles ?? []}
            />
          ) : null}
          <main className="app-main">
            <div className="container">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
