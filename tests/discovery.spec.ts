import {test,expect} from '@playwright/test'

test('discovery API returns trusted-first recommendations and rejects undeclared input',async({request})=>{
  const response=await request.post('/api/discovery',{data:{requirements:[{id:'round-cycle',kind:'lifecycle',description:'Replayable rounds',capabilities:['rounds','replay'],minimumQuality:4}]}})
  expect(response.ok()).toBe(true)
  expect((await response.json()).recommendations[0]).toMatchObject({decision:'reuse',selected:'game-runtime'})
  const invalid=await request.post('/api/discovery',{data:{requirements:[],url:'https://unapproved.example/component.js'}})
  expect(invalid.status()).toBe(422)
  const registry=await(await request.get('/api/components')).json()
  expect(registry.externalCatalog.map((r:{id:string})=>r.id)).toEqual(expect.arrayContaining(['phaser','pixijs','kenney-food-kit','roseblox','rosebud-cli']))
})
