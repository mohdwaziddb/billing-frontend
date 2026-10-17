import { createContext, useContext } from "react";

const MenuCodeContext = createContext<string | null>(null);

export const MenuCodeProvider = MenuCodeContext.Provider;

export const useMenuCode = () => useContext(MenuCodeContext);
