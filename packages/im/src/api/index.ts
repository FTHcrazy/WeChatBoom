class PokemonApi {


    static async getPokemonList(id: number) {
        try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
            if (!response.ok) return null;

            const data = await response.json();
            

            return {
                id: data.id,
                name: data.name,
                image: data.sprites.other['official-artwork'].front_default || data.sprites.front_default,
                types: data.types.map((t: any) => t.type.name),
                stats: {
                    hp: data.stats[0].base_stat,
                    attack: data.stats[1].base_stat,
                    defense: data.stats[2].base_stat,
                    spAttack: data.stats[3].base_stat,
                    spDefense: data.stats[4].base_stat,
                    speed: data.stats[5].base_stat
                },
                abilities: data.abilities.map((a: any) => a.ability.name),
                height: data.height / 10, // 转换为米
                weight: data.weight / 10  // 转换为千克
            };
        } catch (error) {
            console.error(`获取宝可梦 #${id} 失败:`, error);
            return null;
        }
    }
}

export default PokemonApi
