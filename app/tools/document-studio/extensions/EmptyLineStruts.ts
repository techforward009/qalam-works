import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node } from "@tiptap/pm/model";

function strutsInBlock(block: Node, pos: number): Decoration[] {
  const decorations: Decoration[] = [];
  block.forEach((child, offset, index) => {
    if (child.type.name !== "hardBreak") return;
    const after = offset + child.nodeSize;
    if (after !== block.content.size && block.maybeChild(index + 1)?.type.name !== "hardBreak") return;
    decorations.push(Decoration.widget(pos + 1 + after, () => {
      const span = document.createElement("span");
      span.setAttribute("data-studio-empty-line-strut", "true");
      span.setAttribute("aria-hidden", "true");
      span.style.cssText = "display:none;width:1px;height:0;pointer-events:none;user-select:none";
      return span;
    }, { side: -1, ignoreSelection: true }));
  });
  return decorations;
}

/** View-only struts. Map unchanged widgets; rescan only text blocks touched by edits. */
export function createEmptyLineStrutPlugin() {
  return new Plugin<DecorationSet>({
    state: {
      init(_, state) {
        const decorations: Decoration[] = [];
        state.doc.descendants((node, pos) => {
          if (node.isTextblock) { decorations.push(...strutsInBlock(node,pos)); return false; }
        });
        return DecorationSet.create(state.doc, decorations);
      },
      apply(tr, previous) {
        if (!tr.docChanged) return previous;
        let decorations = previous.map(tr.mapping, tr.doc);
        const blocks = new Map<number, Node>();
        const add = (pos: number) => {
          const resolved = tr.doc.resolve(Math.max(0,Math.min(tr.doc.content.size,pos)));
          for(let depth=resolved.depth;depth>0;depth--)if(resolved.node(depth).isTextblock){blocks.set(resolved.before(depth),resolved.node(depth));break;}
        };
        tr.mapping.maps.forEach((map,index) => map.forEach((_a,_b,from,to) => {
          const rest=tr.mapping.slice(index+1);
          const start=Math.max(0,rest.map(from,-1)), end=Math.min(tr.doc.content.size,rest.map(to,1));
          tr.doc.nodesBetween(start,end,(node,pos)=>{
            if(node.isTextblock){blocks.set(pos,node);return false;}
          });
          add(start);add(end);
        }));
        for(const [pos,block] of blocks){
          decorations=decorations.remove(decorations.find(pos,pos+block.nodeSize));
          decorations=decorations.add(tr.doc,strutsInBlock(block,pos));
        }
        return decorations;
      },
    },
    props: { decorations(state) { return this.getState(state) ?? DecorationSet.empty; } },
  });
}
