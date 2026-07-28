"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import {
  IconActivity,
  IconBox,
  IconCalendarPlus,
  IconCamera,
  IconClose,
  IconDashboard,
  IconMenu,
  IconSidebar,
  IconSignOut,
  IconUser,
  IconUsers,
} from "./icons";

const STORAGE_KEY = "production_sidebar_collapsed";

export default function Sidebar({ user, employee, roles }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {}
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {}
  }

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (!user) return null;

  const isAdmin = roles?.includes("admin");

  const links = [
    { href: "/", label: "Dashboard", icon: IconDashboard },
    { href: "/shoots", label: "Shoots", icon: IconCamera },
    { href: "/shoots/new", label: "New Shoot", icon: IconCalendarPlus },
    { href: "/equipment", label: "Equipment", icon: IconBox },
    { href: "/users", label: "Users", icon: IconUsers },
    ...(isAdmin
      ? [{ href: "/admin/activity", label: "Activity", icon: IconActivity }]
      : []),
  ];

  const name = employee
    ? [employee.first_name, employee.last_name].filter(Boolean).join(" ")
    : user.email;

  return (
    <>
      <div className="mobile-topbar">
        <button
          type="button"
          className="icon-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <IconMenu />
        </button>
        <span className="brand">Production</span>
      </div>

      {mobileOpen ? (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={`sidebar${collapsed ? " collapsed" : ""}${
          mobileOpen ? " mobile-open" : ""
        }`}
        suppressHydrationWarning
        data-mounted={mounted}
      >
        <div className="sidebar-head">
          <button
            type="button"
            className="icon-btn desktop-only"
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <IconSidebar />
          </button>
          <button
            type="button"
            className="icon-btn mobile-only"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <IconClose />
          </button>
          {!collapsed ? <span className="brand">Production</span> : null}
        </div>

        <div className="sidebar-section-label">
          {collapsed ? "" : "Platform"}
        </div>

        <nav className="sidebar-nav">
          {links.map((l) => {
            const Icon = l.icon;
            const active =
              pathname === l.href ||
              (l.href !== "/" && pathname.startsWith(l.href + "/"));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`sidebar-link${active ? " active" : ""}`}
                title={collapsed ? l.label : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <Icon />
                {!collapsed ? <span>{l.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          {!collapsed ? (
            <div className="sidebar-user">
              <div className="sidebar-user-name">{name}</div>
              <div className="sidebar-user-email muted">{user.email}</div>
            </div>
          ) : null}
          <Link
            href="/profile"
            className={`sidebar-link${
              pathname === "/profile" ? " active" : ""
            }`}
            title="Profile"
            onClick={() => setMobileOpen(false)}
          >
            <IconUser />
            {!collapsed ? <span>Profile</span> : null}
          </Link>
          <button
            type="button"
            className="sidebar-link signout"
            onClick={signOut}
            title="Sign out"
          >
            <IconSignOut />
            {!collapsed ? <span>Sign Out</span> : null}
          </button>
        </div>
      </aside>
    </>
  );
}
