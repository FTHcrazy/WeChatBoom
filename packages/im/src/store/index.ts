import { create } from 'zustand'

export interface Contact {
    id: string,
    name: string,
    nameCN: string,
    image: string,
    types: string[],
    stats: {
        hp: number,
        attack: number,
        defense: number,
        spAttack: number,
        spDefense: number,
        speed: number
    },
    abilities: string[],
    height: number,
    weight: number
}



interface ContactState {
    contacts: Contact[];
    generation: number;
    addContact: (contact: Contact[]) => void;
    clearContacts: () => void;
    setGeneration: (generation: number) => void;
}

export const useContactStore = create<ContactState>((set) => ({
    contacts: [],
    generation: 1,
    addContact: (contact) => set((state) => ({ contacts: [...state.contacts, ...contact] })),
    clearContacts: () => set(() => ({ contacts: [] })),
    setGeneration: (generation) => set(() => ({ generation })),
}))