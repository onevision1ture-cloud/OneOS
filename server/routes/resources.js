const express = require('express');
const { makeCrudRouter } = require('./crud-factory');

const router = express.Router();

router.use('/cargos', makeCrudRouter({ table:'cargos', columns:['name','isAdmin','description'], orderable:false, idPrefix:'cargo' }));

router.use('/users', makeCrudRouter({
  table:'users',
  columns:['name','email','phone','cargoId','isAdmin','verified','status','color','photo','joinedAt','googleSub'],
  orderable:false, idPrefix:'u',
}));

router.use('/clients', makeCrudRouter({
  table:'clients',
  columns:['name','segment','status','contractValue','platforms','contact','notes','order'],
  jsonColumns:['platforms','contact'],
  idPrefix:'cl',
}));

router.use('/boards', makeCrudRouter({
  table:'boards',
  columns:['workspace','name','icon','description','visibility','order'],
  jsonColumns:['visibility'],
  idPrefix:'b',
}));

router.use('/board-groups', makeCrudRouter({
  table:'board_groups',
  columns:['boardId','name','color','order','automation'],
  jsonColumns:['automation'],
  idPrefix:'g',
}));

router.use('/tasks', makeCrudRouter({
  table:'tasks',
  columns:['boardId','groupId','name','owner','status','date','priority','notes','order'],
  idPrefix:'t',
}));

router.use('/board-chats', makeCrudRouter({
  table:'board_chats',
  columns:['boardId','authorId','text','createdAt'],
  orderable:false, idPrefix:'c',
}));

router.use('/crm-leads', makeCrudRouter({
  table:'crm_leads',
  columns:['name','stage','value','contact','nextFollowUp','notes','order'],
  idPrefix:'lead',
}));

router.use('/events', makeCrudRouter({
  table:'events',
  columns:['title','date','time','type','location','description','order'],
  idPrefix:'ev',
}));

router.use('/meetings', makeCrudRouter({
  table:'meetings',
  columns:['title','date','time','link','participants','notes'],
  orderable:false, idPrefix:'mt',
}));

router.use('/goals', makeCrudRouter({
  table:'goals',
  columns:['title','metric','target','current','deadline','owner','order'],
  idPrefix:'goal',
}));

router.use('/planning-posts', makeCrudRouter({
  table:'planning_posts',
  columns:['title','type','date','status','notes','order'],
  idPrefix:'p',
}));

router.use('/meta-ads', makeCrudRouter({
  table:'meta_ads',
  columns:['clientId','campaign','status','budget','spent','results','cpa','roas','dateRange'],
  orderable:false, idPrefix:'ad',
}));

router.use('/contracts', makeCrudRouter({
  table:'contracts',
  columns:['clientId','title','value','startDate','endDate','status','link'],
  orderable:false, idPrefix:'ct',
}));

router.use('/folders', makeCrudRouter({
  table:'folders',
  columns:['parentId','name','order'],
  idPrefix:'f',
}));

router.use('/files', makeCrudRouter({
  table:'files',
  columns:['parentId','name','note','link','order'],
  idPrefix:'file',
}));

router.use('/system-updates', makeCrudRouter({
  table:'system_updates',
  columns:['type','title','body','date'],
  orderable:false, idPrefix:'su',
}));

module.exports = router;
