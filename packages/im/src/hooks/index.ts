import { useContactStore } from "../store";
import { useMemo, useRef, useState } from "react";
import PokemonApi from "../api";
import type { Contact } from "../store";



export const useGenerationRange = () => {
    const limit = 20;

    const offsetRef = useRef(1)

    const generationRef = useRef(0)

    const addContact = useContactStore((state) => state.addContact)

    const [loading, setLoading] = useState(false)







    return useMemo(() => {
        const fetchData = async () => {

            setLoading(true)
            const _start = generationRef.current * limit;
            const _end = _start + limit;

            const promises = [];
            for (let i = _start; i < _end; i++) {
                promises.push(PokemonApi.getPokemonList(i));
            }
            const contacts = await Promise.all(promises);

            offsetRef.current += limit;

            generationRef.current++;

            addContact(contacts.filter((c) => c !== null) as Contact[])

            setLoading(false)
        }

        const loadMore = () => {
            if (loading) return;
            fetchData()
        }

        return {
            fetchData,
            loading,
            loadMore
        }
    }, [loading])
}