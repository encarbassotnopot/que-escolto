# Què escolto?
## Aquest projecte és una tonteria que he fet en dos matins

No sé si era l'idea que tenia des de l'inici, però m'ha acabat fent gràcia poder-ho incrustar a github i fer que s'actualitzi la imatge en temps real.

![](https://que-escolto.eina.workers.dev/playerr)

## Què faig servir:
- [Workers de Cloudflare](https://developers.cloudflare.com/workers/)
- [Api Web d'Spotify](https://developer.spotify.com/documentation/web-api)

## Com funciona:
És ben tonto:
1. Registrem una aplicació a spotify i la vincules al teu compte. [guia](https://developer.spotify.com/documentation/web-api/tutorials/code-flow).
2. Creem el fitxer _.dev.vars_ (seguint l'estructura del _.dev.vars.example_) i desem les variables de la nostra aplicació (ID i secret del client, la URL que haguem definit com a callback i el codi resultant de l'autenticació).
3. Creem un nou projecte de Workers a Cloudflare. Amb el pla gratuït en tens de sobres. [guia](https://developers.cloudflare.com/workers/get-started/guide/)
4. Com que els workers de Cloudflare no tenen estat (s'activen quan algú els crida des d'un endpoint i quan acaben moren i perden la informació), hem de desar les claus de l'API d'Spotify a alguna banda. Jo faig servir la KV de Cloudflare. [guia](https://developers.cloudflare.com/kv/)
5. Actualitzem el camp _kv_namespaces.id_ al fitxer _wrangler.jsonc_ amb l'id de la nostra KV.
6. Si tot va bé, podem executar l'ordre _npx wrangler dev_ i tindrem l'aplicació funcionant localment.
7. Podem penjar l'aplicació amb _npx wrangler deploy_. Haurem de penjar les variables que hem definit a _.dev.vars_ amb _npx wrangler secret put NOM_DEL_SECRET_
8. Si tot va bé, tindrem l'aplicació funcional.

## Endpoints:
**/**
Un embed d'spotify sense més. Fa un fetch a **/spotid** per saber què incrustar. Va ser el primer prototip.

**/spotid**
L'id d'Spotify del que estic escoltant. L'embed el va a buscar aquí l'id del que escolto.

**/coverart**
Això va ser per provar si podia incrustar a github un SVG amb un camp d'_href_ que apuntés fora del servidor. Hauria facilitat la feina, però no funciona per tema de CORS.

**/player**
Aquí hi ha la teca. Un SVG que he fet a mà i en el que actualitzo diversos valors en funció del que estic escoltant.
La imatge de portada l'he de demanar des del servidor i convertir-la a una cadena de base64 per poder-la incrustar al vector (i que github l'agafi sense plorar).


## Problemes?
Si en tens avisa'm suposo.
