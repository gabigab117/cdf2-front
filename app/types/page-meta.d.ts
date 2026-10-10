declare module '#app' {
  interface PageMeta {
    /**
     * A page anyone may open. Every other page is private: it is reserved to the
     * board's members (middleware/auth.global.ts).
     */
    public?: boolean
    /**
     * A board page that lays out its own width, its detail panel touching the
     * window's edge, as the Documents page does: the layout gives it no
     * margin and no maximal width.
     */
    fullWidth?: boolean
    /**
     * A board page with an action of its own in the top bar, « Importer » for
     * the documents, in place of the « Nouveau » menu: it renders it there
     * (`<Teleport defer to="#board-top-bar-action">`).
     */
    topBarAction?: boolean
  }
}

// A module augmentation only applies from a module.
export {}
