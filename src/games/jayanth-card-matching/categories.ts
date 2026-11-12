import { animalsContent, fruitsContent } from './content.ts'

export type CardItem = { id: string; label: string; zh?: string; familiar?: boolean; image?: string; conflicts?: string[]; colour?: string }
export type Category = { id: string; label: string; items: readonly CardItem[] }

export const categories: readonly Category[] = [
  { id: 'animals', label: 'Animals', items: animalsContent },
  { id: 'fruits', label: 'Fruits', items: fruitsContent },
  { id: 'colours', label: 'Colours', items: [
    { id: 'red', label: 'Red', colour: '#d92535' },
    { id: 'blue', label: 'Blue', colour: '#1764d5' },
    { id: 'green', label: 'Green', colour: '#17833c' },
    { id: 'yellow', label: 'Yellow', colour: '#ffdf24' },
    { id: 'purple', label: 'Purple', colour: '#8536bd' },
    { id: 'orange', label: 'Orange', colour: '#f58220', conflicts: ['red', 'yellow', 'brown'] },
    { id: 'pink', label: 'Pink', colour: '#f598c1', conflicts: ['red', 'purple'] },
    { id: 'brown', label: 'Brown', colour: '#78452a', conflicts: ['orange', 'black'] },
    { id: 'black', label: 'Black', colour: '#17191b', conflicts: ['brown', 'grey', 'blue'] },
    { id: 'white', label: 'White', colour: '#ffffff', conflicts: ['grey', 'yellow'] },
    { id: 'grey', label: 'Grey', colour: '#92989e', conflicts: ['black', 'white'] },
    { id: 'turquoise', label: 'Turquoise', colour: '#12c5bf', conflicts: ['blue', 'green'] },
  ] },
]
