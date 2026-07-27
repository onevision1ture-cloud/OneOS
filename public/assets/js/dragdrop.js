/*
 * Onevision OS — helper genérico de arrastar-e-soltar (reordenar e mover entre containers).
 * Usado em: OneTasks (cards e grupos), CRM (leads entre estágios), Clientes, Metas,
 * Planejamento (posts entre dias), Eventos, Arquivos (itens entre pastas).
 *
 * Uso:
 *   DragDrop.enable(document.querySelectorAll('.meu-container'), {
 *     itemSelector: '.meu-item',
 *     onChange({ itemId, fromContainer, toContainer, orderedIdsInTarget }) { ... persistir ... }
 *   });
 */
(function(){

  function afterElement(container, y, itemSelector){
    const els = [...container.querySelectorAll(itemSelector)].filter(el => !el.classList.contains('dragging'));
    let closest = { offset: -Infinity, element: null };
    for(const el of els){
      const box = el.getBoundingClientRect();
      const offset = y - box.top - box.height/2;
      if(offset < 0 && offset > closest.offset){
        closest = { offset, element: el };
      }
    }
    return closest.element;
  }

  function enable(containers, opts){
    containers = Array.from(containers);
    const itemSelector = opts.itemSelector;
    let draggingEl = null;
    let fromContainer = null;

    containers.forEach(container => {
      container.querySelectorAll(itemSelector).forEach(bindItem);

      container.addEventListener('dragover', (e) => {
        if(!draggingEl) return;
        e.preventDefault();
        container.classList.add('drop-target-hover');
        const after = afterElement(container, e.clientY, itemSelector);
        if(after == null) container.appendChild(draggingEl);
        else container.insertBefore(draggingEl, after);
      });
      container.addEventListener('dragleave', (e) => {
        if(e.target === container) container.classList.remove('drop-target-hover');
      });
      container.addEventListener('drop', (e) => {
        e.preventDefault();
        container.classList.remove('drop-target-hover');
      });
    });

    function bindItem(item){
      item.setAttribute('draggable', 'true');
      item.addEventListener('dragstart', (e) => {
        draggingEl = item;
        fromContainer = item.closest(itemSelector.startsWith('.') ? undefined : undefined) || item.parentElement;
        fromContainer = item.parentElement;
        setTimeout(() => item.classList.add('dragging'), 0);
        e.dataTransfer.effectAllowed = 'move';
        try{ e.dataTransfer.setData('text/plain', item.dataset.id || ''); }catch(err){}
      });
      item.addEventListener('dragend', () => {
        if(!draggingEl) return;
        draggingEl.classList.remove('dragging');
        const toContainer = draggingEl.parentElement;
        containers.forEach(c => c.classList.remove('drop-target-hover'));
        const orderedIdsInTarget = [...toContainer.querySelectorAll(itemSelector)].map(el => el.dataset.id);
        if(opts.onChange){
          opts.onChange({
            itemId: draggingEl.dataset.id,
            fromContainer, toContainer,
            orderedIdsInTarget,
            moved: fromContainer !== toContainer,
          });
        }
        draggingEl = null; fromContainer = null;
      });
    }

    return {
      refresh(){ containers.forEach(c => c.querySelectorAll(itemSelector).forEach(bindItem)); }
    };
  }

  window.DragDrop = { enable };
})();
