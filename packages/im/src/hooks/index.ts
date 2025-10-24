import { useContactStore } from "../store";
import { useMemo, useRef } from "react";
import PokemonApi from "../api";
import type { Contact } from "../store";
import { useRequest } from "ahooks";



export const useGenerationRange = () => {
    const limit = 20;

    const offsetRef = useRef(1)

    const generationRef = useRef(0)

    const addContact = useContactStore((state) => state.addContact)

    const clearContacts = useContactStore((state) => state.clearContacts)


    const { runAsync, loading } = useRequest(async (init: boolean = false) => {
        if (init) {
            offsetRef.current = 1
            generationRef.current = 0
            clearContacts()
        }

        const start = Math.max(1, generationRef.current * limit);

        const contacts = (await Promise.all(
            Array.from({ length: limit }, (_, idx) => PokemonApi.getPokemonList(start + idx))
        )).filter((c): c is Contact => c !== null);

        offsetRef.current += limit;
        generationRef.current++;
        addContact(contacts);
    }, { manual: true });


    return useMemo(() => {
        const fetchData = (init: boolean = false) => runAsync(init);

        const loadMore = () => {
            if (loading) return;
            fetchData();
        }

        return {
            fetchData,
            loading,
            loadMore
        }
    }, [loading, runAsync])
}