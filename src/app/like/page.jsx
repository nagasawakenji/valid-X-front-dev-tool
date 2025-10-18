"use client";

import { useState, useEffect, useCallback} from "react";

const BASE = process.env.NEXT_PUBLIC_API || "https://localhost:8443";

async function jsonFetch(url, options = {}) {
    const res = fetch(url, {
        credentials: "include",
        ...options,
    });

    if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
    }

    const contentType = res.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
        return await res.json();
    } else {
        return null;
    }
}

