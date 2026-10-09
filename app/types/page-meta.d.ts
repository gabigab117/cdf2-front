declare module '#app' {
  interface PageMeta {
    /**
     * A page anyone may open. Every other page is private: it is reserved to the
     * board's members (middleware/auth.global.ts).
     */
    public?: boolean
  }
}

// A module augmentation only applies from a module.
export {}
