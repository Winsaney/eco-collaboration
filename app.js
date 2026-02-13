// ============================================
// 生态项目协作系统 - Core Application
// ============================================

// ---- Data Store ----
const Store = {
    demands: [],
    analyses: [],
    partners: [],
    matchings: [],
    activities: [],
    counters: { demand: 0, analysis: 0, partner: 0, matching: 0 }
};

// ---- Utility Functions ----
function genId(prefix) {
    const d = new Date();
    const ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    Store.counters[prefix === 'REQ' ? 'demand' : prefix === 'PA' ? 'analysis' : prefix === 'PT' ? 'partner' : 'matching']++;
    const n = Store.counters[prefix === 'REQ' ? 'demand' : prefix === 'PA' ? 'analysis' : prefix === 'PT' ? 'partner' : 'matching'];
    return `${prefix}-${ds}-${String(n).padStart(3, '0')}`;
}

function formatDate(d) {
    if (!d) return '-';
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function timeAgo(d) {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}分钟前`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}小时前`;
    return `${Math.floor(hrs / 24)}天前`;
}

function addActivity(text, color = '#6c5ce7') {
    Store.activities.unshift({ text, color, time: new Date().toISOString() });
    if (Store.activities.length > 20) Store.activities.pop();
}

function showToast(title, message, type = 'success') {
    const icons = { success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️' };
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><div class="toast-content"><div class="toast-title">${title}</div><div class="toast-message">${message}</div></div>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('toast-out'); setTimeout(() => toast.remove(), 300); }, 3500);
}

function getStatusClass(status) {
    const map = {
        '待分析': 'pending', '分析中': 'analyzing', '已完成分析': 'analyzed', '待匹配': 'matching',
        '匹配中': 'matching', '已推荐': 'recommended', '已签约': 'signed', '已关闭': 'closed',
        '已完成': 'analyzed', '需补充信息': 'supplement', '已确认': 'confirmed', '已拒绝': 'rejected',
        '沟通中': 'communicating', '产品已评分': 'analyzing', '售前已评分': 'analyzing', '已评分': 'analyzed'
    };
    return map[status] || 'pending';
}

function getStars(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }

function saveData() { localStorage.setItem('ecoSystem', JSON.stringify(Store)); }
function loadData() {
    const d = localStorage.getItem('ecoSystem');
    if (d) {
        const p = JSON.parse(d);
        // Detect old data format (no groupId or old productConfirm fields) and re-init
        if (p.matchings && p.matchings.length > 0 && (!p.matchings[0].groupId || p.matchings[0].productConfirm !== undefined)) {
            initSampleData();
        } else {
            Object.assign(Store, p);
        }
    }
    else initSampleData();
}

// ---- Navigation ----
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');
const pageTitle = document.getElementById('page-title');
const titles = { dashboard: '数据洞察', demands: '需求管理', analysis: '产品分析', partners: '伙伴管理', matching: '伙伴匹配', flow: '流程跟踪', gantt: '项目排期', form: '需求表单' };

function switchPage(page) {
    navItems.forEach(n => n.classList.toggle('active', n.dataset.page === page));
    pages.forEach(p => p.classList.toggle('active', p.id === `page-${page}`));
    pageTitle.textContent = titles[page] || page;
    if (page === 'dashboard') renderDashboard();
    if (page === 'demands') renderDemands();
    if (page === 'analysis') renderAnalysis();
    if (page === 'partners') renderPartners();
    if (page === 'matching') renderMatching();
    if (page === 'flow') renderFlow();
    if (page === 'gantt') renderGantt();
}

navItems.forEach(n => n.addEventListener('click', e => { e.preventDefault(); switchPage(n.dataset.page); }));

// Menu toggle
document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

// Sidebar collapse
const sidebarCollapseBtn = document.getElementById('sidebar-collapse-btn');
if (sidebarCollapseBtn) {
    sidebarCollapseBtn.addEventListener('click', () => {
        document.body.classList.toggle('collapsed');
    });
}

// ---- Modal ----
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalSave = document.getElementById('modal-save');
let currentModalCallback = null;

function openModal(title, html, onSave) {
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    currentModalCallback = onSave;
    modalOverlay.classList.add('active');
}
function closeModal() { modalOverlay.classList.remove('active'); currentModalCallback = null; }
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
modalSave.addEventListener('click', () => { if (currentModalCallback) currentModalCallback(); });

// ---- Drawer ----
const drawerOverlay = document.getElementById('drawer-overlay');
function openDrawer(title, html) {
    document.getElementById('drawer-title').textContent = title;
    document.getElementById('drawer-body').innerHTML = html;
    drawerOverlay.classList.add('active');
}
function closeDrawer() { drawerOverlay.classList.remove('active'); }
document.getElementById('drawer-close').addEventListener('click', closeDrawer);
drawerOverlay.addEventListener('click', e => { if (e.target === drawerOverlay) closeDrawer(); });

// ---- Render Demands ----
function renderDemands() {
    const sf = document.getElementById('demand-status-filter').value;
    const catf = document.getElementById('demand-category-filter').value;
    const inf = document.getElementById('demand-industry-filter').value;
    let data = Store.demands.filter(d => (!sf || d.status === sf) && (!catf || d.category === catf) && (!inf || d.industry === inf));
    const tbody = document.getElementById('demands-tbody');
    tbody.innerHTML = data.map(d => `<tr>
        <td><span style="color:var(--primary-light);font-weight:600">${d.id}</span></td>
        <td><span class="tag-badge" style="background:${d.category === '万象企业版' ? '#e17055' : '#0984e3'};color:white">${d.category || '项目需求'}</span></td>
        <td>${d.customerName}</td>
        <td><span class="tag-badge">${d.industry}</span></td>
        <td>${d.projectName}</td>
        <td>${(d.projectTypes || []).map(t => `<span class="tag-badge">${t}</span>`).join('')}</td>
        <td>${d.budget}</td>
        <td><span class="status-badge status-${getStatusClass(d.status)}">${d.status}</span></td>
        <td>${d.owner}</td>
        <td>${formatDate(d.createdAt)}</td>
        <td>
            <button class="action-btn action-primary" onclick="viewDemandDetail('${d.id}')">查看</button>
            <button class="action-btn" style="color:var(--danger);margin-left:4px" onclick="deleteDemand('${d.id}')">删除</button>
        </td>
    </tr>`).join('');
    document.getElementById('demand-badge').textContent = Store.demands.filter(d => d.status === '待分析').length || '';
}

document.getElementById('demand-status-filter').addEventListener('change', renderDemands);
document.getElementById('demand-category-filter').addEventListener('change', renderDemands);
document.getElementById('demand-industry-filter').addEventListener('change', renderDemands);

function viewDemandDetail(id) {
    const d = Store.demands.find(x => x.id === id);
    if (!d) return;
    openDrawer(`需求详情 - ${d.id}`, `
        <div class="detail-section"><div class="detail-section-title">基本信息</div>
        ${[['类别', d.category || '项目需求'], ['客户名称', d.customerName], ['行业', d.industry], ['项目名称', d.projectName], ['项目类型', (d.projectTypes || []).join('、')],
        ['预算范围', d.budget], ['期望交付', formatDate(d.deadline)], ['需求来源', d.source], ['状态', d.status], ['负责人', d.owner], ['创建时间', formatDate(d.createdAt)]
        ].map(([l, v]) => `<div class="detail-item"><span class="detail-label">${l}</span><span class="detail-value">${v || '-'}</span></div>`).join('')}
        </div>
        <div class="detail-section"><div class="detail-section-title">需求描述</div><p style="font-size:13px;color:var(--text-secondary);line-height:1.8">${d.description || '-'}</p></div>
        <div class="detail-section"><div class="detail-section-title">核心痛点</div><p style="font-size:13px;color:var(--text-secondary);line-height:1.8">${d.painpoints || '-'}</p></div>
        <div class="drawer-footer" style="padding:20px;border-top:1px solid var(--border-color);margin-top:20px;display:flex;justify-content:space-between">
            <button class="btn btn-secondary" style="color:var(--danger);border-color:rgba(214, 48, 49, 0.3)" onclick="deleteDemand('${d.id}');closeDrawer()">删除需求</button>
            <button class="btn btn-primary" onclick="editDemand('${d.id}')">编辑需求</button>
        </div>
    `);
}

function editDemand(id) {
    const d = Store.demands.find(x => x.id === id); if (!d) return;
    const inds = ['制造', '金融', '政府', '教育', '零售', '医疗', '其他'].map(i => `<option ${d.industry === i ? 'selected' : ''}>${i}</option>`).join('');
    const buds = ['10万以下', '10-50万', '50-100万', '100-300万', '300万以上'].map(b => `<option ${d.budget === b ? 'selected' : ''}>${b}</option>`).join('');
    const srcs = ['销售转来', '客户直接联系', '合作伙伴推荐', '市场活动'].map(s => `<option ${d.source === s ? 'selected' : ''}>${s}</option>`).join('');

    openModal('编辑需求', `
        <div class="form-row"><div class="form-group"><label>类别</label><select id="e-cat"><option ${d.category === '万象企业版' ? 'selected' : ''}>万象企业版</option><option ${d.category === '项目需求' ? 'selected' : ''}>项目需求</option></select></div>
        <div class="form-group"><label>客户名称 *</label><input id="e-cname" value="${d.customerName}"></div></div>
        <div class="form-row"><div class="form-group"><label>客户行业 *</label><select id="e-cind">${inds}</select></div>
        <div class="form-group"><label>项目名称 *</label><input id="e-pname" value="${d.projectName}"></div></div>
        <div class="form-row"><div class="form-group"><label>预算范围</label><select id="e-budget">${buds}</select></div>
        <div class="form-row"><div class="form-group"><label>期望交付时间</label><input type="date" id="e-deadline" value="${d.deadline}"></div>
        <div class="form-group"><label>需求来源</label><select id="e-source">${srcs}</select></div></div>
        <div class="form-group" style="margin-top:8px"><label>需求描述</label><textarea id="e-desc" rows="3">${d.description || ''}</textarea></div>
        <div class="form-group" style="margin-top:8px"><label>核心痛点</label><textarea id="e-pain" rows="2">${d.painpoints || ''}</textarea></div>
    `, () => {
        d.category = document.getElementById('e-cat').value;
        d.customerName = document.getElementById('e-cname').value;
        d.industry = document.getElementById('e-cind').value;
        d.projectName = document.getElementById('e-pname').value;
        d.budget = document.getElementById('e-budget').value;
        d.deadline = document.getElementById('e-deadline').value;
        d.source = document.getElementById('e-source').value;
        d.description = document.getElementById('e-desc').value;
        d.painpoints = document.getElementById('e-pain').value;
        d.updatedAt = new Date().toISOString();
        saveData(); closeModal(); renderDemands(); viewDemandDetail(id);
        showToast('已更新', '需求信息已保存', 'success');
    });
}

function deleteDemand(id) {
    if (!confirm('确定要删除这个需求吗？\n\n注意：此操作将同步删除关联的分析记录和匹配推荐，且无法撤销。')) return;
    Store.demands = Store.demands.filter(d => d.id !== id);
    Store.analyses = Store.analyses.filter(a => a.demandId !== id);
    Store.matchings = Store.matchings.filter(m => m.demandId !== id);
    saveData();
    renderDemands();
    renderDashboard();
    renderFlow();
    showToast('已删除', `需求 ${id} 及其关联数据已移除`, 'success');
}

// New Demand Modal
document.getElementById('btn-new-demand').addEventListener('click', () => {
    openModal('新建需求', `
        <div class="form-row"><div class="form-group"><label>类别 *</label><select id="m-cat"><option value="项目需求">项目需求</option><option value="万象企业版">万象企业版</option></select></div>
        <div class="form-group"><label>客户名称 *</label><input id="m-cname" placeholder="客户公司名称"></div></div>
        <div class="form-row"><div class="form-group"><label>客户行业 *</label><select id="m-cind"><option value="">选择</option><option>制造</option><option>金融</option><option>政府</option><option>教育</option><option>零售</option><option>医疗</option><option>其他</option></select></div>
        <div class="form-group"><label>项目名称 *</label><input id="m-pname" placeholder="项目简称"></div></div>
        <div class="form-row"><div class="form-group"><label>预算范围</label><select id="m-budget"><option value="">选择</option><option>10万以下</option><option>10-50万</option><option>50-100万</option><option>100-300万</option><option>300万以上</option></select></div></div>
        <div class="form-row"><div class="form-group"><label>期望交付时间</label><input type="date" id="m-deadline"></div>
        <div class="form-group"><label>需求来源</label><select id="m-source"><option value="">选择</option><option>销售转来</option><option>客户直接联系</option><option>合作伙伴推荐</option><option>市场活动</option></select></div></div>
        <div class="form-group" style="margin-top:8px"><label>需求描述</label><textarea id="m-desc" rows="3" placeholder="业务场景和需求"></textarea></div>
    `, () => {
        const cn = document.getElementById('m-cname').value.trim();
        const ci = document.getElementById('m-cind').value;
        const pn = document.getElementById('m-pname').value.trim();
        const cat = document.getElementById('m-cat').value;
        if (!cn || !ci || !pn) { showToast('提示', '请填写必填字段', 'warning'); return; }
        const dem = {
            id: genId('REQ'), category: cat, customerName: cn, industry: ci, projectName: pn,
            projectTypes: [], budget: document.getElementById('m-budget').value || '未定',
            deadline: document.getElementById('m-deadline').value, source: document.getElementById('m-source').value || '未知',
            description: document.getElementById('m-desc').value, painpoints: '', status: '待分析',
            owner: '待分配', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        };
        Store.demands.push(dem);
        addActivity(`新需求「${pn}」已创建，客户：${cn}`, '#6c5ce7');
        saveData(); closeModal(); renderDemands();
        showToast('需求已创建', `${dem.id} - ${pn}`, 'success');
    });
});

// ---- Render Analysis ----
function renderAnalysis() {
    const sf = document.getElementById('analysis-status-filter').value;
    let data = Store.analyses.filter(a => !sf || a.status === sf);
    document.getElementById('analysis-tbody').innerHTML = data.map(a => {
        const dem = Store.demands.find(d => d.id === a.demandId);
        return `<tr>
        <td><span style="color:var(--primary-light);font-weight:600">${a.id}</span></td>
        <td>${dem ? dem.projectName : a.demandId}</td>
        <td>${'⭐'.repeat(a.clarity)}</td>
        <td><span class="tag-badge">${a.complexity}</span></td>
        <td>${a.productForm}</td>
        <td>${a.estimatedDays}</td>
        <td>${a.analyst}</td>
        <td><span class="status-badge status-${getStatusClass(a.status)}">${a.status}</span></td>
        <td><button class="action-btn action-primary" onclick="viewAnalysisDetail('${a.id}')">查看</button></td>
    </tr>`;
    }).join('');
}

document.getElementById('analysis-status-filter').addEventListener('change', renderAnalysis);

function viewAnalysisDetail(id) {
    const a = Store.analyses.find(x => x.id === id); if (!a) return;
    const dem = Store.demands.find(d => d.id === a.demandId);
    openDrawer(`分析详情 - ${a.id}`, `
        <div class="detail-section"><div class="detail-section-title">分析信息</div>
        ${[['关联需求', dem ? dem.projectName : a.demandId], ['需求清晰度', '⭐'.repeat(a.clarity)], ['技术复杂度', a.complexity],
        ['产品形态', a.productForm], ['估计人天', a.estimatedDays + '天'], ['分析人', a.analyst], ['状态', a.status], ['分析时间', formatDate(a.analysisDate)]
        ].map(([l, v]) => `<div class="detail-item"><span class="detail-label">${l}</span><span class="detail-value">${v}</span></div>`).join('')}
        </div>
        <div class="detail-section"><div class="detail-section-title">核心功能</div><p style="font-size:13px;color:var(--text-secondary);line-height:1.8">${a.coreFunctions || '-'}</p></div>
        <div class="detail-section"><div class="detail-section-title">分析结论</div><p style="font-size:13px;color:var(--text-secondary);line-height:1.8">${a.conclusion || '-'}</p></div>
        <div class="drawer-footer" style="padding:20px;border-top:1px solid var(--border-color);margin-top:20px;text-align:right">
            <button class="btn btn-primary" onclick="editAnalysis('${a.id}')">编辑分析</button>
        </div>
    `);
}

function editAnalysis(id) {
    const a = Store.analyses.find(x => x.id === id); if (!a) return;
    const comps = ['低', '中', '高'].map(c => `<option ${a.complexity === c ? 'selected' : ''}>${c}</option>`).join('');
    const forms = ['定制开发', '标准产品', '联合解决方案', '需要评估'].map(f => `<option ${a.productForm === f ? 'selected' : ''}>${f}</option>`).join('');

    openModal('编辑产品分析', `
        <div class="form-row"><div class="form-group"><label>分析状态</label><select id="e-astatus"><option ${a.status === '分析中' ? 'selected' : ''}>分析中</option><option ${a.status === '已完成' ? 'selected' : ''}>已完成</option></select></div>
        <div class="form-group"><label>需求清晰度(1-5)</label><input type="number" id="e-aclarity" value="${a.clarity}" min="1" max="5"></div></div>
        <div class="form-row"><div class="form-group"><label>技术复杂度</label><select id="e-acomp">${comps}</select></div>
        <div class="form-row"><div class="form-group"><label>产品形态</label><select id="e-aform">${forms}</select></div>
        <div class="form-group"><label>估计人天</label><input type="number" id="e-adays" value="${a.estimatedDays}"></div></div>
        <div class="form-group"><label>分析人</label><input id="e-aanalyst" value="${a.analyst}"></div>
        <div class="form-group" style="margin-top:8px"><label>核心功能</label><textarea id="e-afunc" rows="2">${a.coreFunctions || ''}</textarea></div>
        <div class="form-group" style="margin-top:8px"><label>分析结论</label><textarea id="e-aconc" rows="2">${a.conclusion || ''}</textarea></div>
    `, () => {
        a.status = document.getElementById('e-astatus').value;
        a.clarity = parseInt(document.getElementById('e-aclarity').value);
        a.complexity = document.getElementById('e-acomp').value;
        a.productForm = document.getElementById('e-aform').value;
        a.estimatedDays = parseInt(document.getElementById('e-adays').value);
        a.analyst = document.getElementById('e-aanalyst').value;
        a.coreFunctions = document.getElementById('e-afunc').value;
        a.conclusion = document.getElementById('e-aconc').value;

        // Sync demand status
        const dem = Store.demands.find(d => d.id === a.demandId);
        if (dem) {
            if (a.status === '分析中') dem.status = '分析中';
            else if (a.status === '已完成') dem.status = '已完成分析';
            dem.updatedAt = new Date().toISOString();
        }

        saveData(); closeModal(); renderAnalysis(); viewAnalysisDetail(id);
        showToast('已更新', '分析信息已保存', 'success');
    });
}

document.getElementById('btn-new-analysis').addEventListener('click', () => {
    const demOpts = Store.demands.filter(d => ['待分析', '分析中'].includes(d.status)).map(d => `<option value="${d.id}">${d.projectName}(${d.id})</option>`).join('');
    openModal('新建产品分析', `
        <div class="form-row"><div class="form-group"><label>关联需求 *</label><select id="m-adem"><option value="">选择需求</option>${demOpts}</select></div>
        <div class="form-group"><label>初始状态</label><select id="m-astatus"><option>分析中</option><option>已完成</option></select></div></div>
        <div class="form-row"><div class="form-group"><label>需求清晰度(1-5)</label><select id="m-aclarity"><option>3</option><option>1</option><option>2</option><option>4</option><option>5</option></select></div>
        <div class="form-group"><label>技术复杂度</label><select id="m-acomp"><option>中</option><option>低</option><option>高</option></select></div></div>
        <div class="form-row"><div class="form-group"><label>产品形态</label><select id="m-aform"><option>定制开发</option><option>标准产品</option><option>联合解决方案</option><option>需要评估</option></select></div>
        <div class="form-group"><label>估计人天</label><input type="number" id="m-adays" value="30"></div></div>
        <div class="form-group"><label>分析人</label><input id="m-aanalyst" value="产品经理"></div>
        <div class="form-group" style="margin-top:8px"><label>核心功能</label><textarea id="m-afunc" rows="2" placeholder="功能清单"></textarea></div>
        <div class="form-group" style="margin-top:8px"><label>分析结论</label><textarea id="m-aconc" rows="2" placeholder="可行性和风险判断"></textarea></div>
    `, () => {
        const demId = document.getElementById('m-adem').value;
        const status = document.getElementById('m-astatus').value;
        if (!demId) { showToast('提示', '请选择关联需求', 'warning'); return; }
        const an = {
            id: genId('PA'), demandId: demId, clarity: parseInt(document.getElementById('m-aclarity').value),
            complexity: document.getElementById('m-acomp').value, productForm: document.getElementById('m-aform').value,
            estimatedDays: parseInt(document.getElementById('m-adays').value) || 30, analyst: document.getElementById('m-aanalyst').value || '未指定',
            coreFunctions: document.getElementById('m-afunc').value, conclusion: document.getElementById('m-aconc').value,
            techStack: [], industryReq: '加分项', deliverables: '', status: status, analysisDate: new Date().toISOString()
        };
        Store.analyses.push(an);
        const dem = Store.demands.find(d => d.id === demId);
        if (dem) {
            dem.status = status === '分析中' ? '分析中' : '已完成分析';
            dem.updatedAt = new Date().toISOString();
        }
        addActivity(`产品分析「${an.id}」${status === '已完成' ? '已完成' : '进行中'}，关联需求：${dem ? dem.projectName : demId}`, '#0984e3');
        saveData(); closeModal(); renderAnalysis();
        showToast('分析记录已创建', `${an.id}`, 'success');
    });
});

// ---- Render Partners ----
function renderPartners() {
    const sf = document.getElementById('partner-status-filter').value;
    const schf = document.getElementById('partner-schedule-filter').value;
    let data = Store.partners.filter(p => (!sf || p.cooperationStatus === sf) && (!schf || p.schedule === schf));
    document.getElementById('partners-grid').innerHTML = data.map(p => `
        <div class="partner-card" onclick="viewPartnerDetail('${p.id}')" style="cursor:pointer">
            <div class="partner-header">
                <span class="partner-name">${p.companyName}</span>
                <span class="partner-id">${p.id}</span>
            </div>
            <div class="partner-meta">
                <span class="partner-meta-item">👥 ${p.companySize}</span>
                <span class="partner-meta-item"><span class="star-rating">${getStars(p.qualityScore)}</span></span>
                <span class="schedule-badge schedule-${p.schedule === '充足' ? 'available' : p.schedule === '紧张' ? 'tight' : 'full'}">${p.schedule}</span>
            </div>
            <div class="partner-tags">${(p.skills || []).slice(0, 5).map(s => `<span class="tag-badge">${s}</span>`).join('')}</div>
            <div class="partner-stats">
                <div class="partner-stat"><span class="partner-stat-value">${p.historyCount}</span><span class="partner-stat-label">合作次数</span></div>
                <div class="partner-stat"><span class="partner-stat-value">${p.availableStaff}</span><span class="partner-stat-label">可投入人力</span></div>
                <div class="partner-stat"><span class="partner-stat-value">${p.contact}</span><span class="partner-stat-label">联系人</span></div>
            </div>
        </div>
    `).join('');
}

function viewPartnerDetail(id) {
    const p = Store.partners.find(x => x.id === id); if (!p) return;
    openDrawer(`伙伴详情 - ${p.id}`, `
        <div class="detail-section"><div class="detail-section-title">基本信息</div>
        ${[['公司名称', p.companyName], ['规模', p.companySize], ['合作状态', p.cooperationStatus], ['质量评分', '⭐'.repeat(p.qualityScore)],
        ['档期情况', p.schedule], ['可投入人力', p.availableStaff + '人'], ['联系人', p.contact], ['联系电话', p.phone]
        ].map(([l, v]) => `<div class="detail-item"><span class="detail-label">${l}</span><span class="detail-value">${v}</span></div>`).join('')}
        </div>
        <div class="detail-section"><div class="detail-section-title">技能标签</div><div class="partner-tags">${(p.skills || []).map(s => `<span class="tag-badge">${s}</span>`).join('')}</div></div>
        <div class="detail-section"><div class="detail-section-title">擅长行业</div><div class="partner-tags">${(p.industries || []).map(s => `<span class="tag-badge" style="background:rgba(9, 132, 227, 0.1);color:#0984e3">${s}</span>`).join('')}</div></div>
        <div class="detail-section"><div class="detail-section-title">项目类型</div><div class="partner-tags">${(p.projectTypes || []).map(s => `<span class="tag-badge" style="background:rgba(253, 203, 110, 0.1);color:#e17055">${s}</span>`).join('')}</div></div>
        <div class="detail-section"><div class="detail-section-title">备注</div><p style="font-size:13px;color:var(--text-secondary);line-height:1.8">${p.notes || '暂无备注'}</p></div>
        <div class="drawer-footer" style="padding:20px;border-top:1px solid var(--border-color);margin-top:20px;text-align:right">
            <button class="btn btn-primary" onclick="editPartner('${p.id}')">编辑伙伴</button>
        </div>
    `);
}

function editPartner(id) {
    const p = Store.partners.find(x => x.id === id); if (!p) return;
    const schs = ['充足', '紧张', '饱和'].map(s => `<option ${p.schedule === s ? 'selected' : ''}>${s}</option>`).join('');

    openModal('编辑合作伙伴', `
        <div class="form-row"><div class="form-group"><label>公司名称 *</label><input id="e-pname" value="${p.companyName}"></div>
        <div class="form-group"><label>公司规模</label><select id="e-psize"><option ${p.companySize === '1-50人' ? 'selected' : ''}>1-50人</option><option ${p.companySize === '51-200人' ? 'selected' : ''}>51-200人</option><option ${p.companySize === '200人以上' ? 'selected' : ''}>200人以上</option></select></div></div>
        <div class="form-row"><div class="form-group"><label>档期情况</label><select id="e-psch">${schs}</select></div>
        <div class="form-group"><label>可投入人力</label><input type="number" id="e-pstaff" value="${p.availableStaff}"></div></div>
        <div class="form-row"><div class="form-group"><label>联系人</label><input id="e-pcontact" value="${p.contact}"></div>
        <div class="form-group"><label>联系电话</label><input id="e-pphone" value="${p.phone}"></div></div>
        <div class="form-group"><label>技能标签 (逗号分隔)</label><input id="e-pskills" value="${(p.skills || []).join(',')}"></div>
        <div class="form-group" style="margin-top:8px"><label>备注</label><textarea id="e-pnotes" rows="2">${p.notes || ''}</textarea></div>
    `, () => {
        p.companyName = document.getElementById('e-pname').value;
        p.companySize = document.getElementById('e-psize').value;
        p.schedule = document.getElementById('e-psch').value;
        p.availableStaff = parseInt(document.getElementById('e-pstaff').value);
        p.contact = document.getElementById('e-pcontact').value;
        p.phone = document.getElementById('e-pphone').value;
        p.skills = document.getElementById('e-pskills').value.split(/[,，]/).map(s => s.trim()).filter(s => s);
        p.notes = document.getElementById('e-pnotes').value;
        saveData(); closeModal(); renderPartners(); viewPartnerDetail(id);
        showToast('已更新', '伙伴信息已保存', 'success');
    });
}

document.getElementById('partner-status-filter').addEventListener('change', renderPartners);
document.getElementById('partner-schedule-filter').addEventListener('change', renderPartners);

document.getElementById('btn-new-partner').addEventListener('click', () => {
    openModal('新增合作伙伴', `
        <div class="form-row"><div class="form-group"><label>公司名称 *</label><input id="m-pname2"></div>
        <div class="form-group"><label>公司规模</label><select id="m-psize"><option>11-50人</option><option>1-10人</option><option>51-200人</option><option>200人以上</option></select></div></div>
        <div class="form-row"><div class="form-group"><label>联系人</label><input id="m-pcontact"></div>
        <div class="form-group"><label>联系电话</label><input id="m-pphone"></div></div>
        <div class="form-row"><div class="form-group"><label>交付质量(1-5)</label><select id="m-pquality"><option>4</option><option>1</option><option>2</option><option>3</option><option>5</option></select></div>
        <div class="form-group"><label>档期</label><select id="m-pschedule"><option>充足</option><option>紧张</option><option>已满</option></select></div></div>
        <div class="form-row"><div class="form-group"><label>可投入人力</label><input type="number" id="m-pstaff" value="5"></div>
        <div class="form-group"><label>合作历史(次)</label><input type="number" id="m-phist" value="0"></div></div>
    `, () => {
        const name = document.getElementById('m-pname2').value.trim();
        if (!name) { showToast('提示', '请填写公司名称', 'warning'); return; }
        Store.partners.push({
            id: genId('PT'), companyName: name, companySize: document.getElementById('m-psize').value,
            industries: [], skills: ['Java', '前端'], projectTypes: [], historyCount: parseInt(document.getElementById('m-phist').value) || 0,
            qualityScore: parseInt(document.getElementById('m-pquality').value), availableStaff: parseInt(document.getElementById('m-pstaff').value) || 0,
            schedule: document.getElementById('m-pschedule').value, cooperationStatus: '活跃',
            contact: document.getElementById('m-pcontact').value || '未填', phone: document.getElementById('m-pphone').value || '', notes: ''
        });
        addActivity(`新伙伴「${name}」已入库`, '#00b894');
        saveData(); closeModal(); renderPartners();
        showToast('伙伴已添加', name, 'success');
    });
});

// Helper: compute combined score (system 40% + product 30% + presales 30%)
function getCombinedScore(m) {
    const ps = m.productScore != null ? m.productScore : 0;
    const ss = m.presalesScore != null ? m.presalesScore : 0;
    const hasProduct = m.productScore != null;
    const hasPresales = m.presalesScore != null;
    if (!hasProduct && !hasPresales) return m.totalScore;
    return Math.round(m.totalScore * 0.4 + (ps * 10) * 0.3 + (ss * 10) * 0.3);
}

// ---- Render Matching (3-partner recommendation + scoring) ----
function renderMatching() {
    const sf = document.getElementById('match-status-filter').value;
    const df = document.getElementById('match-demand-filter').value;
    let data = Store.matchings.filter(m => (!sf || m.status === sf) && (!df || m.demandId === df));

    // Populate demand filter
    const demFilter = document.getElementById('match-demand-filter');
    const uniqueDemands = [...new Set(Store.matchings.map(m => m.demandId))];
    const currentVal = demFilter.value;
    demFilter.innerHTML = '<option value="">全部需求</option>' + uniqueDemands.map(did => {
        const dem = Store.demands.find(d => d.id === did);
        return `<option value="${did}"${did === currentVal ? ' selected' : ''}>${dem ? dem.projectName : did}</option>`;
    }).join('');

    // Group by groupId for card view
    const groups = {};
    data.forEach(m => {
        const gid = m.groupId || m.id;
        if (!groups[gid]) groups[gid] = [];
        groups[gid].push(m);
    });

    // Render group cards
    const container = document.getElementById('matching-groups-container');
    container.innerHTML = Object.entries(groups).map(([gid, items]) => {
        items.sort((a, b) => (a.rank || 99) - (b.rank || 99));
        const dem = Store.demands.find(d => d.id === items[0].demandId);
        const anyConfirmed = items.find(m => m.status === '已确认' || m.status === '已签约');
        const anyScored = items.find(m => m.productScore != null || m.presalesScore != null);
        const anySigned = items.find(m => m.status === '已签约');
        return `<div class="matching-group-card">
            <div class="matching-group-header">
                <div class="matching-group-title">
                    <h4>🎯 ${dem ? dem.projectName : items[0].demandId}</h4>
                    <span class="group-demand-tag">${dem ? dem.customerName : ''} · ${dem ? dem.industry : ''}</span>
                </div>
                <div class="matching-group-meta">
                    <span>推荐 ${items.length} 位伙伴</span>
                    <span>·</span>
                    <span>${timeAgo(items[0].matchDate)}</span>
                    <div class="group-actions-wrap">
                        <button class="btn btn-ghost group-actions-trigger" onclick="toggleGroupMenu('${gid}')">⚙ 调整 ▾</button>
                        <div class="group-actions-menu" id="group-menu-${gid}">
                            ${anyScored && !anySigned ? `<button onclick="revokeGroupScores('${gid}')">↩ 撤回评分</button>` : ''}
                            ${!anySigned ? `<button onclick="resetGroup('${gid}')">🔄 重新推荐</button>` : ''}
                            ${!anySigned ? `<button onclick="addPartnerToGroup('${gid}')">➕ 追加伙伴</button>` : ''}
                            <button onclick="deleteGroup('${gid}')">🗑 删除整组</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="matching-group-body">
                ${items.map(m => renderCandidateCard(m, anyConfirmed)).join('')}
            </div>
        </div>`;
    }).join('') || '<div style="text-align:center;color:var(--text-tertiary);padding:40px">暂无匹配推荐</div>';

    // Also render table view
    document.getElementById('matching-tbody').innerHTML = data.map(m => {
        const dem = Store.demands.find(d => d.id === m.demandId);
        const par = Store.partners.find(p => p.id === m.partnerId);
        const sysColor = m.totalScore >= 80 ? '#00b894' : m.totalScore >= 60 ? '#fdcb6e' : '#e17055';
        const combined = getCombinedScore(m);
        const cColor = combined >= 80 ? '#00b894' : combined >= 60 ? '#fdcb6e' : '#e17055';
        const psBadge = m.productScore != null ? `<span class="score-pill score-done">${m.productScore}</span>` : '<span class="score-pill score-wait">待评</span>';
        const ssBadge = m.presalesScore != null ? `<span class="score-pill score-done">${m.presalesScore}</span>` : '<span class="score-pill score-wait">待评</span>';
        return `<tr>
        <td><span style="color:var(--primary-light);font-weight:600">${m.id}</span></td>
        <td>${dem ? dem.projectName : m.demandId}</td>
        <td>${par ? par.companyName : m.partnerId} ${m.rank ? '<sup style="color:var(--warning)">第' + m.rank + '推荐</sup>' : ''}</td>
        <td><span style="color:${sysColor};font-weight:600">${m.totalScore}</span></td>
        <td>${psBadge}</td>
        <td>${ssBadge}</td>
        <td><span style="color:${cColor};font-weight:700;font-size:15px">${combined}</span></td>
        <td><span class="status-badge status-${getStatusClass(m.status)}">${m.status}</span></td>
        <td>
            <button class="action-btn action-primary" onclick="viewMatchDetail('${m.id}')">查看</button>
            ${m.status !== '已签约' ? `<button class="action-btn" onclick="editMatch('${m.id}')" style="color:var(--warning)">编辑</button>` : ''}
        </td>
    </tr>`;
    }).join('');
}

function renderCandidateCard(m, anyConfirmed) {
    const par = Store.partners.find(p => p.id === m.partnerId);
    const scoreColor = m.totalScore >= 80 ? '#00b894' : m.totalScore >= 60 ? '#fdcb6e' : '#e17055';
    const combined = getCombinedScore(m);
    const cColor = combined >= 80 ? '#00b894' : combined >= 60 ? '#fdcb6e' : '#e17055';
    const isFinal = m.status === '已确认' || m.status === '已签约';
    const cardClass = isFinal ? 'is-selected' : (anyConfirmed && !isFinal) ? 'is-rejected' : '';
    const canScore = !isFinal && !anyConfirmed && m.status !== '已拒绝';
    const bothScored = m.productScore != null && m.presalesScore != null;
    const canSelect = bothScored && !anyConfirmed && m.status !== '已拒绝';
    const canEdit = m.status !== '已签约';
    return `<div class="match-candidate-card ${cardClass}">
        <span class="candidate-rank rank-${m.rank || 1}">${m.rank || 1}</span>
        <div class="candidate-partner-name">${par ? par.companyName : m.partnerId}</div>
        <div class="candidate-score">
            <span class="candidate-score-value" style="color:${scoreColor}">${m.totalScore}</span>
            <span class="candidate-score-label">系统匹配</span>
        </div>
        <div class="candidate-details">
            <span class="candidate-detail-item">🔧 技术 ${m.techScore}/10</span>
            <span class="candidate-detail-item">🏭 行业 ${m.industryScore}/10</span>
            <span class="candidate-detail-item">📏 规模 ${m.scaleScore}/10</span>
            <span class="candidate-detail-item">📅 档期 ${m.scheduleScore}/10</span>
        </div>
        <div class="candidate-mode"><span class="tag-badge">${m.cooperationMode}</span></div>
        <div class="candidate-scoring-row">
            <div class="scoring-item">
                <span class="scoring-label">🔍 产品评分</span>
                ${m.productScore != null
            ? `<span class="scoring-value scored">${m.productScore}<small>/10</small></span><span class="scoring-by">${m.productScoreBy || ''}</span>`
            : (canScore ? `<button class="btn btn-score" onclick="scoreMatch('${m.id}','product')">去评分</button>` : '<span class="scoring-value pending">-</span>')}
            </div>
            <div class="scoring-item">
                <span class="scoring-label">📋 售前评分</span>
                ${m.presalesScore != null
            ? `<span class="scoring-value scored">${m.presalesScore}<small>/10</small></span><span class="scoring-by">${m.presalesScoreBy || ''}</span>`
            : (canScore ? `<button class="btn btn-score" onclick="scoreMatch('${m.id}','presales')">去评分</button>` : '<span class="scoring-value pending">-</span>')}
            </div>
        </div>
        <div class="candidate-combined">
            <span class="combined-label">综合得分</span>
            <span class="combined-value" style="color:${cColor}">${combined}</span>
            <span class="combined-bar"><span class="combined-fill" style="width:${combined}%;background:${cColor}"></span></span>
        </div>
        ${isFinal ? '<div class="final-selected-badge">✅ 最终选定伙伴</div>' : ''}
        ${canSelect && !isFinal ? `<div class="candidate-actions">
            <button class="btn btn-confirm" onclick="selectFinalPartner('${m.id}')">✅ 选定该伙伴</button>
            <button class="btn btn-reject" onclick="rejectMatch('${m.id}')">拒绝</button>
        </div>` : ''}
        ${canEdit ? `<div class="candidate-adjust-actions">
            <button class="btn-text-action" onclick="editMatch('${m.id}')">✏️ 编辑</button>
            ${m.productScore != null || m.presalesScore != null ? `<button class="btn-text-action" onclick="revokeScore('${m.id}')">↩ 撤回评分</button>` : ''}
            ${m.status === '已拒绝' ? `<button class="btn-text-action" onclick="reactivateMatch('${m.id}')">🔄 重新激活</button>` : ''}
            <button class="btn-text-action btn-text-danger" onclick="replacePartner('${m.id}')">🔁 替换伙伴</button>
        </div>` : ''}
    </div>`;
}

// Toggle group menu
function toggleGroupMenu(gid) {
    const menu = document.getElementById('group-menu-' + gid);
    document.querySelectorAll('.group-actions-menu.show').forEach(m => { if (m !== menu) m.classList.remove('show'); });
    menu.classList.toggle('show');
}
// Close menu on outside click
document.addEventListener('click', e => {
    if (!e.target.closest('.group-actions-wrap')) {
        document.querySelectorAll('.group-actions-menu.show').forEach(m => m.classList.remove('show'));
    }
});

document.getElementById('match-status-filter').addEventListener('change', renderMatching);
document.getElementById('match-demand-filter').addEventListener('change', renderMatching);

// ---- Score a match (product or presales scoring) ----
function scoreMatch(matchId, role) {
    const m = Store.matchings.find(x => x.id === matchId);
    if (!m) return;
    const par = Store.partners.find(p => p.id === m.partnerId);
    const roleName = role === 'product' ? '产品' : '售前';
    const existing = role === 'product' ? m.productScore : m.presalesScore;
    const existingComment = role === 'product' ? (m.productComment || '') : (m.presalesComment || '');
    openModal(`${roleName}评分 - ${par ? par.companyName : m.partnerId}`, `
        <div style="text-align:center;margin-bottom:16px">
            <div style="font-size:13px;color:var(--text-tertiary)">系统匹配度</div>
            <div style="font-size:28px;font-weight:700;color:var(--primary-light)">${m.totalScore}<small style="font-size:14px;color:var(--text-tertiary)">/100</small></div>
        </div>
        <div class="form-group"><label>${roleName}评分 (1-10) <span class="required">*</span></label>
            <input type="range" id="sm-score" min="1" max="10" value="${existing || 7}" style="width:100%" oninput="document.getElementById('sm-score-val').textContent=this.value">
            <div style="text-align:center;font-size:24px;font-weight:700;color:var(--primary-light);margin:8px 0" id="sm-score-val">${existing || 7}</div>
        </div>
        <div class="form-group"><label>评分理由</label><textarea id="sm-comment" rows="3" placeholder="请说明评分理由...">${existingComment}</textarea></div>
        <div class="form-group"><label>评分人</label><input id="sm-scorer" value="${role === 'product' ? '产品经理' : '售前顾问'}"></div>
    `, () => {
        const score = parseInt(document.getElementById('sm-score').value);
        const comment = document.getElementById('sm-comment').value;
        const scorer = document.getElementById('sm-scorer').value;
        if (role === 'product') {
            m.productScore = score; m.productComment = comment;
            m.productScoreBy = scorer; m.productScoreTime = new Date().toISOString();
        } else {
            m.presalesScore = score; m.presalesComment = comment;
            m.presalesScoreBy = scorer; m.presalesScoreTime = new Date().toISOString();
        }
        // Update status
        if (m.productScore != null && m.presalesScore != null) {
            m.status = '已评分';
            addActivity(`${par ? par.companyName : ''}已获得产品和售前双方评分，综合得分：${getCombinedScore(m)}`, '#00b894');
            showToast('评分完成', `${par ? par.companyName : ''}综合得分：${getCombinedScore(m)}`, 'success');
        } else if (m.productScore != null) {
            m.status = '产品已评分';
            addActivity(`产品为伙伴「${par ? par.companyName : ''}」评分：${score}/10`, '#0984e3');
            showToast('产品已评分', `${score}/10，等待售前评分`, 'info');
        } else {
            m.status = '售前已评分';
            addActivity(`售前为伙伴「${par ? par.companyName : ''}」评分：${score}/10`, '#0984e3');
            showToast('售前已评分', `${score}/10，等待产品评分`, 'info');
        }
        saveData(); closeModal(); renderMatching();
    });
}

// ---- Select final partner (after both scored) ----
function selectFinalPartner(matchId) {
    const m = Store.matchings.find(x => x.id === matchId);
    if (!m) return;
    m.status = '已确认';
    Store.matchings.filter(x => x.groupId === m.groupId && x.id !== m.id).forEach(x => {
        if (x.status !== '已确认' && x.status !== '已签约') x.status = '已拒绝';
    });
    const dem = Store.demands.find(d => d.id === m.demandId);
    const par = Store.partners.find(p => p.id === m.partnerId);
    if (dem) { dem.status = '已推荐'; dem.updatedAt = new Date().toISOString(); }
    addActivity(`🎉 选定伙伴「${par ? par.companyName : ''}」，综合得分${getCombinedScore(m)}，需求：${dem ? dem.projectName : ''}`, '#00b894');
    showToast('🎉 伙伴已选定', `${par ? par.companyName : ''}（综合${getCombinedScore(m)}分）`, 'success');
    saveData(); renderMatching();
}

// ---- Reject a match ----
function rejectMatch(matchId) {
    const m = Store.matchings.find(x => x.id === matchId);
    if (!m) return;
    m.status = '已拒绝';
    const par = Store.partners.find(p => p.id === m.partnerId);
    addActivity(`伙伴「${par ? par.companyName : ''}」已被拒绝`, '#e17055');
    showToast('已拒绝', par ? par.companyName : '', 'warning');
    saveData();
    renderMatching();
}

// ---- Edit Match (edit scores, mode, reason) ----
function editMatch(matchId) {
    const m = Store.matchings.find(x => x.id === matchId);
    if (!m) return;
    const par = Store.partners.find(p => p.id === m.partnerId);
    const modeOptions = ['联合交付', '总分包', '能力互补', '劳务外包'].map(
        mode => `<option${mode === m.cooperationMode ? ' selected' : ''}>${mode}</option>`
    ).join('');
    openModal(`编辑匹配 - ${par ? par.companyName : m.partnerId} `, `
    < div class="form-row" ><div class="form-group"><label>技术匹配 (1-10)</label><input type="number" id="em-tech" value="${m.techScore}" min="1" max="10"></div>
        <div class="form-group"><label>行业匹配 (1-10)</label><input type="number" id="em-ind" value="${m.industryScore}" min="1" max="10"></div></div >
        <div class="form-row"><div class="form-group"><label>规模匹配 (1-10)</label><input type="number" id="em-scale" value="${m.scaleScore}" min="1" max="10"></div>
        <div class="form-group"><label>档期匹配 (1-10)</label><input type="number" id="em-sch" value="${m.scheduleScore}" min="1" max="10"></div></div>
        <div class="form-row"><div class="form-group"><label>合作模式</label><select id="em-mode">${modeOptions}</select></div>
        <div class="form-group"><label>匹配度 (自动计算)</label><input id="em-total" value="${m.totalScore}" disabled style="opacity:0.6"></div></div>
        <div class="form-group" style="margin-top:8px"><label>推荐理由</label><textarea id="em-reason" rows="2">${m.reason || ''}</textarea></div>
        <div class="form-group" style="margin-top:8px"><label>潜在风险</label><textarea id="em-risks" rows="2">${m.risks || ''}</textarea></div>
        <script>
            ['em-tech','em-ind','em-scale','em-sch'].forEach(id => {
                document.getElementById(id).addEventListener('input', () => {
                    const t = parseInt(document.getElementById('em-tech').value)||0;
                    const i = parseInt(document.getElementById('em-ind').value)||0;
                    const s = parseInt(document.getElementById('em-scale').value)||0;
                    const c = parseInt(document.getElementById('em-sch').value)||0;
                    document.getElementById('em-total').value = Math.round((t+i+s+c)*2.5);
                });
            });
        </script>
`, () => {
        m.techScore = parseInt(document.getElementById('em-tech').value) || m.techScore;
        m.industryScore = parseInt(document.getElementById('em-ind').value) || m.industryScore;
        m.scaleScore = parseInt(document.getElementById('em-scale').value) || m.scaleScore;
        m.scheduleScore = parseInt(document.getElementById('em-sch').value) || m.scheduleScore;
        m.totalScore = Math.round((m.techScore + m.industryScore + m.scaleScore + m.scheduleScore) * 2.5);
        m.cooperationMode = document.getElementById('em-mode').value;
        m.reason = document.getElementById('em-reason').value;
        m.risks = document.getElementById('em-risks').value;
        addActivity(`匹配「${m.id}」评分已更新，新匹配度：${m.totalScore} 分`, '#fdcb6e');
        saveData(); closeModal(); renderMatching();
        showToast('已更新', `匹配度：${m.totalScore} 分`, 'success');
    });
}

// ---- Revoke Score (single match) ----
function revokeScore(matchId) {
    const m = Store.matchings.find(x => x.id === matchId);
    if (!m) return;
    const par = Store.partners.find(p => p.id === m.partnerId);
    const wasConfirmed = m.status === '已确认';
    m.productScore = null; m.presalesScore = null;
    m.productComment = null; m.presalesComment = null;
    m.productScoreBy = null; m.presalesScoreBy = null;
    m.productScoreTime = null; m.presalesScoreTime = null;
    m.status = '已推荐';
    if (wasConfirmed) {
        Store.matchings.filter(x => x.groupId === m.groupId && x.id !== m.id && x.status === '已拒绝').forEach(x => {
            x.status = x.productScore != null && x.presalesScore != null ? '已评分' : '已推荐';
        });
    }
    addActivity(`已撤回对伙伴「${par ? par.companyName : ''}」的评分，重新进入评估`, '#fdcb6e');
    showToast('已撤回评分', `${par ? par.companyName : ''} 重新进入评估`, 'info');
    saveData();
    renderMatching();
}

// ---- Revoke Group Scores (all in group) ----
function revokeGroupScores(groupId) {
    Store.matchings.filter(m => m.groupId === groupId).forEach(m => {
        m.productScore = null; m.presalesScore = null;
        m.productComment = null; m.presalesComment = null;
        m.productScoreBy = null; m.presalesScoreBy = null;
        m.productScoreTime = null; m.presalesScoreTime = null;
        m.status = '已推荐';
    });
    addActivity(`匹配组「${groupId}」所有评分已撤回，重新进入评估`, '#fdcb6e');
    showToast('已撤回所有评分', '所有伙伴重新进入评估', 'info');
    saveData();
    renderMatching();
}

// ---- Reset Group (re-recommend all) ----
function resetGroup(groupId) {
    const items = Store.matchings.filter(m => m.groupId === groupId);
    if (items.length === 0) return;
    const dem = Store.demands.find(d => d.id === items[0].demandId);
    // Remove all matches in this group
    Store.matchings = Store.matchings.filter(m => m.groupId !== groupId);
    // Reset demand status
    if (dem) { dem.status = '已完成分析'; dem.updatedAt = new Date().toISOString(); }
    addActivity(`需求「${dem ? dem.projectName : ''}」的伙伴推荐已重置，需重新匹配`, '#e17055');
    showToast('已重置', `${dem ? dem.projectName : ''} 需重新推荐伙伴`, 'warning');
    saveData();
    renderMatching();
}

// ---- Delete Group ----
function deleteGroup(groupId) {
    const items = Store.matchings.filter(m => m.groupId === groupId);
    if (items.length === 0) return;
    const dem = Store.demands.find(d => d.id === items[0].demandId);
    Store.matchings = Store.matchings.filter(m => m.groupId !== groupId);
    if (dem && !Store.matchings.some(m => m.demandId === dem.id)) {
        dem.status = '已完成分析'; dem.updatedAt = new Date().toISOString();
    }
    addActivity(`已删除需求「${dem ? dem.projectName : ''}」的整组匹配推荐`, '#e17055');
    showToast('已删除', '整组匹配推荐已移除', 'warning');
    saveData();
    renderMatching();
}

// ---- Reactivate rejected match ----
function reactivateMatch(matchId) {
    const m = Store.matchings.find(x => x.id === matchId);
    if (!m) return;
    m.productScore = null; m.presalesScore = null;
    m.productComment = null; m.presalesComment = null;
    m.productScoreBy = null; m.presalesScoreBy = null;
    m.productScoreTime = null; m.presalesScoreTime = null;
    m.status = '已推荐';
    const par = Store.partners.find(p => p.id === m.partnerId);
    addActivity(`伙伴「${par ? par.companyName : ''}」已重新激活`, '#0984e3');
    showToast('已激活', `${par ? par.companyName : ''} 重新进入推荐`, 'success');
    saveData();
    renderMatching();
}

// ---- Replace Partner in match ----
function replacePartner(matchId) {
    const m = Store.matchings.find(x => x.id === matchId);
    if (!m) return;
    const existingPartnerIds = Store.matchings.filter(x => x.groupId === m.groupId).map(x => x.partnerId);
    const parOpts = Store.partners.filter(p => p.cooperationStatus === '活跃' && !existingPartnerIds.includes(p.id))
        .map(p => `<option value="${p.id}">${p.companyName} (${p.schedule})</option>`).join('');
    const par = Store.partners.find(p => p.id === m.partnerId);
    const modeOpts = ['联合交付', '总分包', '能力互补', '劳务外包'].map(
        mode => `<option${mode === m.cooperationMode ? ' selected' : ''}>${mode}</option>`
    ).join('');
    openModal(`替换伙伴 - 原：${par ? par.companyName : ''}`, `
    <div class="form-group"><label>选择新伙伴 *</label><select id="rp-partner"><option value="">选择</option>${parOpts}</select></div>
        <div class="form-row"><div class="form-group"><label>技术匹配 (1-10)</label><input type="number" id="rp-tech" value="${m.techScore}" min="1" max="10"></div>
        <div class="form-group"><label>行业匹配 (1-10)</label><input type="number" id="rp-ind" value="${m.industryScore}" min="1" max="10"></div></div>
        <div class="form-row"><div class="form-group"><label>规模匹配 (1-10)</label><input type="number" id="rp-scale" value="${m.scaleScore}" min="1" max="10"></div>
        <div class="form-group"><label>档期匹配 (1-10)</label><input type="number" id="rp-sch" value="${m.scheduleScore}" min="1" max="10"></div></div>
        <div class="form-row"><div class="form-group"><label>合作模式</label><select id="rp-mode">${modeOpts}</select></div>
        <div class="form-group"></div></div>
        <div class="form-group" style="margin-top:8px"><label>推荐理由</label><textarea id="rp-reason" rows="2"></textarea></div>
`, () => {
        const newParId = document.getElementById('rp-partner').value;
        if (!newParId) { showToast('提示', '请选择新伙伴', 'warning'); return; }
        const oldName = par ? par.companyName : m.partnerId;
        m.partnerId = newParId;
        m.techScore = parseInt(document.getElementById('rp-tech').value) || 7;
        m.industryScore = parseInt(document.getElementById('rp-ind').value) || 7;
        m.scaleScore = parseInt(document.getElementById('rp-scale').value) || 7;
        m.scheduleScore = parseInt(document.getElementById('rp-sch').value) || 7;
        m.totalScore = Math.round((m.techScore + m.industryScore + m.scaleScore + m.scheduleScore) * 2.5);
        m.cooperationMode = document.getElementById('rp-mode').value;
        m.reason = document.getElementById('rp-reason').value;
        m.productScore = null; m.presalesScore = null;
        m.productComment = null; m.presalesComment = null;
        m.productScoreBy = null; m.presalesScoreBy = null;
        m.productScoreTime = null; m.presalesScoreTime = null;
        m.status = '已推荐';
        m.matchDate = new Date().toISOString();
        const newPar = Store.partners.find(p => p.id === newParId);
        addActivity(`伙伴替换：「${oldName}」→「${newPar ? newPar.companyName : ''}」`, '#fdcb6e');
        saveData(); closeModal(); renderMatching();
        showToast('伙伴已替换', `${oldName} → ${newPar ? newPar.companyName : ''} `, 'success');
    });
}

// ---- Add Partner to existing group ----
function addPartnerToGroup(groupId) {
    const items = Store.matchings.filter(m => m.groupId === groupId);
    if (items.length === 0) return;
    const existingPartnerIds = items.map(x => x.partnerId);
    const parOpts = Store.partners.filter(p => p.cooperationStatus === '活跃' && !existingPartnerIds.includes(p.id))
        .map(p => `<option value="${p.id}">${p.companyName} (${p.schedule})</option>`).join('');
    const dem = Store.demands.find(d => d.id === items[0].demandId);
    const modeOpts = '<option>联合交付</option><option>总分包</option><option>能力互补</option><option>劳务外包</option>';
    const nextRank = Math.max(...items.map(x => x.rank || 0)) + 1;
    openModal(`追加伙伴 - ${dem ? dem.projectName : ''}`, `
    <div class="form-group"><label>选择伙伴 *</label><select id="ap-partner"><option value="">选择</option>${parOpts}</select></div>
        <div class="form-row"><div class="form-group"><label>技术匹配 (1-10)</label><input type="number" id="ap-tech" value="7" min="1" max="10"></div>
        <div class="form-group"><label>行业匹配 (1-10)</label><input type="number" id="ap-ind" value="7" min="1" max="10"></div></div>
        <div class="form-row"><div class="form-group"><label>规模匹配 (1-10)</label><input type="number" id="ap-scale" value="7" min="1" max="10"></div>
        <div class="form-group"><label>档期匹配 (1-10)</label><input type="number" id="ap-sch" value="7" min="1" max="10"></div></div>
        <div class="form-row"><div class="form-group"><label>合作模式</label><select id="ap-mode">${modeOpts}</select></div>
        <div class="form-group"></div></div>
        <div class="form-group" style="margin-top:8px"><label>推荐理由</label><textarea id="ap-reason" rows="2"></textarea></div>
`, () => {
        const parId = document.getElementById('ap-partner').value;
        if (!parId) { showToast('提示', '请选择伙伴', 'warning'); return; }
        const tech = parseInt(document.getElementById('ap-tech').value) || 7;
        const ind = parseInt(document.getElementById('ap-ind').value) || 7;
        const scale = parseInt(document.getElementById('ap-scale').value) || 7;
        const sch = parseInt(document.getElementById('ap-sch').value) || 7;
        const total = Math.round((tech + ind + scale + sch) * 2.5);
        Store.matchings.push({
            id: genId('MC'), groupId, demandId: items[0].demandId, partnerId: parId,
            rank: nextRank, totalScore: total,
            techScore: tech, industryScore: ind, scaleScore: scale, scheduleScore: sch, qualityScore: 8,
            reason: document.getElementById('ap-reason').value, risks: '',
            cooperationMode: document.getElementById('ap-mode').value,
            matcher: '生态负责人', matchDate: new Date().toISOString(), status: '已推荐',
            productScore: null, presalesScore: null,
            productComment: null, presalesComment: null,
            productScoreBy: null, presalesScoreBy: null,
            productScoreTime: null, presalesScoreTime: null
        });
        const newPar = Store.partners.find(p => p.id === parId);
        addActivity(`为「${dem ? dem.projectName : ''}」追加推荐伙伴：${newPar ? newPar.companyName : ''} `, '#0984e3');
        saveData(); closeModal(); renderMatching();
        showToast('伙伴已追加', newPar ? newPar.companyName : '', 'success');
    });
}

// ---- View Match Detail ----
function viewMatchDetail(id) {
    const m = Store.matchings.find(x => x.id === id); if (!m) return;
    const dem = Store.demands.find(d => d.id === m.demandId);
    const par = Store.partners.find(p => p.id === m.partnerId);
    const combined = getCombinedScore(m);
    const psDisplay = m.productScore != null ? `${m.productScore}/10 (${m.productScoreBy || ''})` : '⏳ 待评分';
    const ssDisplay = m.presalesScore != null ? `${m.presalesScore}/10 (${m.presalesScoreBy || ''})` : '⏳ 待评分';
    openDrawer(`匹配详情 - ${m.id}`, `
        <div class="detail-section"><div class="detail-section-title">匹配信息</div>
        ${[['关联需求', dem ? dem.projectName : m.demandId], ['推荐伙伴', par ? par.companyName : m.partnerId],
        ['推荐排名', '第' + (m.rank || 1) + '推荐'], ['系统匹配度', m.totalScore + '/100'],
        ['技术匹配', m.techScore + '/10'], ['行业匹配', m.industryScore + '/10'], ['规模匹配', m.scaleScore + '/10'],
        ['档期匹配', m.scheduleScore + '/10'], ['合作模式', m.cooperationMode], ['状态', m.status]
        ].map(([l, v]) => `<div class="detail-item"><span class="detail-label">${l}</span><span class="detail-value">${v}</span></div>`).join('')}
        </div>
        <div class="detail-section"><div class="detail-section-title">评分信息</div>
        <div class="detail-item"><span class="detail-label">产品评分</span><span class="detail-value">${psDisplay}</span></div>
        ${m.productComment ? `<div class="detail-item"><span class="detail-label">产品评语</span><span class="detail-value" style="font-size:12px">${m.productComment}</span></div>` : ''}
        <div class="detail-item"><span class="detail-label">售前评分</span><span class="detail-value">${ssDisplay}</span></div>
        ${m.presalesComment ? `<div class="detail-item"><span class="detail-label">售前评语</span><span class="detail-value" style="font-size:12px">${m.presalesComment}</span></div>` : ''}
        <div class="detail-item"><span class="detail-label">综合得分</span><span class="detail-value" style="font-weight:700;color:var(--primary-light)">${combined}</span></div>
        </div>
        <div class="detail-section"><div class="detail-section-title">推荐理由</div><p style="font-size:13px;color:var(--text-secondary);line-height:1.8">${m.reason || '-'}</p></div>
        <div class="detail-section"><div class="detail-section-title">潜在风险</div><p style="font-size:13px;color:var(--text-secondary);line-height:1.8">${m.risks || '-'}</p></div>
        ${m.status !== '已签约' ? `<div class="detail-section" style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="editMatch('${m.id}');closeDrawer()">✏️ 编辑</button>
            ${m.productScore != null || m.presalesScore != null ? `<button class="btn btn-ghost" onclick="revokeScore('${m.id}');closeDrawer()">↩ 撤回评分</button>` : ''}
            <button class="btn btn-ghost" onclick="replacePartner('${m.id}');closeDrawer()">🔁 替换伙伴</button>
        </div>` : ''}
    `);
}

// New Match - 3 partner recommendation
document.getElementById('btn-new-match').addEventListener('click', () => {
    const demOpts = Store.demands.filter(d => ['已完成分析', '待匹配', '匹配中'].includes(d.status)).map(d => `<option value="${d.id}">${d.projectName} (${d.customerName})</option>`).join('');
    const parOpts = Store.partners.filter(p => p.cooperationStatus === '活跃').map(p => `<option value="${p.id}">${p.companyName} (${p.schedule})</option>`).join('');
    const modeOpts = '<option>联合交付</option><option>总分包</option><option>能力互补</option><option>劳务外包</option>';
    const makePartnerSection = (num, rankClass) => `
    <div class="partner-select-section">
            <h5><span class="rank-num ${rankClass}">  ${num}</span> 第${num}推荐伙伴</h5>
            <div class="form-row"><div class="form-group"><label>伙伴 *</label><select id="m-mpar${num}"><option value="">选择伙伴</option>${parOpts}</select></div>
            <div class="form-group"><label>合作模式</label><select id="m-mmode${num}">${modeOpts}</select></div></div>
            <div class="form-row"><div class="form-group"><label>技术匹配(1-10)</label><input type="number" id="m-mtech${num}" value="${9 - num}" min="1" max="10"></div>
            <div class="form-group"><label>行业匹配(1-10)</label><input type="number" id="m-mind${num}" value="${8 - num + 1}" min="1" max="10"></div></div>
            <div class="form-row"><div class="form-group"><label>规模匹配(1-10)</label><input type="number" id="m-mscale${num}" value="8" min="1" max="10"></div>
            <div class="form-group"><label>档期匹配(1-10)</label><input type="number" id="m-msch${num}" value="${10 - num}" min="1" max="10"></div></div>
            <div class="form-group"><label>推荐理由</label><textarea id="m-mreason${num}" rows="2" placeholder="为什么推荐这个伙伴"></textarea></div>
        </div>`;
    openModal('推荐伙伴（3选1）', `
    <div class="form-row"><div class="form-group"><label>关联需求 *</label><select id="m-mdem"><option value="">选择需求</option>${demOpts}</select></div>
        <div class="form-group"><label>匹配人</label><input id="m-mmatcher" value="生态负责人"></div></div>
    <div class="partner-select-grid">
        ${makePartnerSection(1, 'r1')}
        ${makePartnerSection(2, 'r2')}
        ${makePartnerSection(3, 'r3')}
    </div>
`, () => {
        const demId = document.getElementById('m-mdem').value;
        if (!demId) { showToast('提示', '请选择关联需求', 'warning'); return; }
        const partners = [1, 2, 3].map(n => ({
            partnerId: document.getElementById(`m-mpar${n}`).value,
            mode: document.getElementById(`m-mmode${n}`).value,
            tech: parseInt(document.getElementById(`m-mtech${n}`).value) || 7,
            ind: parseInt(document.getElementById(`m-mind${n}`).value) || 7,
            scale: parseInt(document.getElementById(`m-mscale${n}`).value) || 7,
            sch: parseInt(document.getElementById(`m-msch${n}`).value) || 7,
            reason: document.getElementById(`m-mreason${n}`).value
        }));
        const selected = partners.filter(p => p.partnerId);
        if (selected.length < 2) { showToast('提示', '请至少选择2个推荐伙伴', 'warning'); return; }
        // Check duplicates
        const ids = selected.map(p => p.partnerId);
        if (new Set(ids).size !== ids.length) { showToast('提示', '不能选择重复的伙伴', 'warning'); return; }
        const groupId = 'GRP-' + Date.now();
        const matcher = document.getElementById('m-mmatcher').value || '生态负责人';
        selected.forEach((p, i) => {
            const total = Math.round((p.tech + p.ind + p.scale + p.sch) * 2.5);
            Store.matchings.push({
                id: genId('MC'), groupId, demandId: demId, partnerId: p.partnerId,
                rank: i + 1, totalScore: total,
                techScore: p.tech, industryScore: p.ind, scaleScore: p.scale, scheduleScore: p.sch, qualityScore: 8,
                reason: p.reason, risks: '', cooperationMode: p.mode,
                matcher, matchDate: new Date().toISOString(), status: '已推荐',
                productScore: null, presalesScore: null,
                productComment: null, presalesComment: null,
                productScoreBy: null, presalesScoreBy: null,
                productScoreTime: null, presalesScoreTime: null
            });
        });
        const dem = Store.demands.find(d => d.id === demId);
        if (dem) { dem.status = '已推荐'; dem.updatedAt = new Date().toISOString(); }
        addActivity(`已为「${dem ? dem.projectName : demId}」推荐 ${selected.length} 个伙伴，待产品和售前评分`, '#00b894');
        saveData(); closeModal(); renderMatching();
        showToast('推荐已创建', `已推荐 ${selected.length} 个伙伴，等待产品和售前评分`, 'success');
    });
});

// ---- Render Flow (Kanban) ----
function renderFlow() {
    const statusMap = { '待分析': 'pending', '分析中': 'analyzing', '已完成分析': 'toMatch', '待匹配': 'toMatch', '匹配中': 'toMatch', '已推荐': 'recommended', '已签约': 'signed' };
    const cols = { pending: [], analyzing: [], toMatch: [], recommended: [], signed: [] };
    Store.demands.forEach(d => { const col = statusMap[d.status]; if (col && cols[col]) cols[col].push(d); });

    const makeCard = d => {
        let extraInfo = '';
        if (d.status === '已推荐') {
            const matches = Store.matchings.filter(m => m.demandId === d.id && m.status !== '已拒绝');
            const count = matches.length;
            if (count > 0) {
                const names = matches.map(m => {
                    const p = Store.partners.find(p => p.id === m.partnerId);
                    return p ? p.companyName : m.partnerId;
                }).map(n => `<div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">• ${n}</div>`).join('');
                extraInfo = `<div class="flow-card-extra" style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border-color);font-size:11px;color:var(--text-secondary)">
                    <div style="margin-bottom:4px">推荐伙伴 (${count}):</div>
                    <div style="color:var(--primary-light);display:flex;flex-direction:column;gap:2px">${names}</div>
                </div>`;
            }
        } else if (d.status === '已签约') {
            const match = Store.matchings.find(m => m.demandId === d.id && m.status === '已签约');
            if (match) {
                const p = Store.partners.find(p => p.id === match.partnerId);
                const name = p ? p.companyName : match.partnerId;
                extraInfo = `<div class="flow-card-extra" style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border-color);font-size:11px;color:var(--text-secondary)">
                    <div style="margin-bottom:2px">签约伙伴:</div>
                    <div style="color:var(--success);font-weight:600">✅ ${name}</div>
                </div>`;
            }
        }

        return `<div class="flow-card" onclick="viewDemandDetail('${d.id}')">
        <div class="flow-card-title">${d.projectName}</div>
        <div class="flow-card-customer">${d.customerName} · ${d.industry}</div>
        <div class="flow-card-budget">💰 ${d.budget}</div>
        ${extraInfo}
        <div class="flow-card-footer">
            <span class="flow-card-assignee"><span class="flow-card-assignee-avatar">${(d.owner || '?')[0]}</span>${d.owner}</span>
            <span class="flow-card-time">${timeAgo(d.createdAt)}</span>
        </div></div>`;
    };

    document.getElementById('flow-col-pending').innerHTML = cols.pending.map(makeCard).join('');
    document.getElementById('flow-col-analyzing').innerHTML = cols.analyzing.map(makeCard).join('');
    document.getElementById('flow-col-toMatch').innerHTML = cols.toMatch.map(makeCard).join('');
    document.getElementById('flow-col-recommended').innerHTML = cols.recommended.map(makeCard).join('');
    document.getElementById('flow-col-signed').innerHTML = cols.signed.map(makeCard).join('');
    document.getElementById('flow-count-pending').textContent = cols.pending.length;
    document.getElementById('flow-count-analyzing').textContent = cols.analyzing.length;
    document.getElementById('flow-count-toMatch').textContent = cols.toMatch.length;
    document.getElementById('flow-count-recommended').textContent = cols.recommended.length;
    document.getElementById('flow-count-signed').textContent = cols.signed.length;
}

// ---- Render Dashboard ----
function renderDashboard() {
    document.getElementById('stat-total-demands').textContent = Store.demands.length;
    document.getElementById('stat-pending-analysis').textContent = Store.demands.filter(d => d.status === '待分析').length;
    document.getElementById('stat-signed').textContent = Store.demands.filter(d => d.status === '已签约').length;
    document.getElementById('stat-partners').textContent = Store.partners.filter(p => p.cooperationStatus === '活跃').length;

    // Activity list
    document.getElementById('activity-list').innerHTML = Store.activities.map(a => `
    <div class="activity-item"><span class="activity-dot" style="background:${a.color}"></span>
        <div class="activity-content"><div class="activity-text">${a.text}</div><div class="activity-time">${timeAgo(a.time)}</div></div></div>
    `).join('') || '<div style="text-align:center;color:var(--text-tertiary);padding:40px">暂无动态</div>';

    // Funnel chart
    const statuses = ['待分析', '分析中', '已完成分析', '已推荐', '已签约'];
    const colors = ['#6c5ce7', '#0984e3', '#00b894', '#fdcb6e', '#e17055'];
    const counts = statuses.map(s => Store.demands.filter(d => d.status === s).length);
    const maxC = Math.max(...counts, 1);
    document.getElementById('funnel-chart').innerHTML = statuses.map((s, i) => {
        const w = Math.max(30, 100 - i * 15);
        return `<div class="funnel-step" style="width:${w}%;background:${colors[i]}">${s} <span class="funnel-value">${counts[i]}</span></div>`;
    }).join('');

    // Canvas charts
    drawPieChart('chart-demand-status', statuses, counts, colors);
    drawBarChart('chart-partner-freq');
    drawPieChart('chart-project-type', ['软件开发', '系统集成', '咨询服务', '产品代理', '联合研发'],
        [5, 3, 2, 1, 2], ['#6c5ce7', '#0984e3', '#00b894', '#fdcb6e', '#e17055']);
}

// Simple Canvas Charts
function drawPieChart(canvasId, labels, data, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const total = data.reduce((a, b) => a + b, 0) || 1;
    const cx = w * 0.4, cy = h * 0.5, r = Math.min(cx, cy) - 20;
    let startAngle = -Math.PI / 2;
    data.forEach((val, i) => {
        const slice = (val / total) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startAngle, startAngle + slice);
        ctx.fillStyle = colors[i]; ctx.fill();
        startAngle += slice;
    });
    // Inner circle for donut
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#1e1e42'; ctx.fill();
    // Center text
    ctx.fillStyle = '#e8e8f0'; ctx.font = 'bold 20px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(total, cx, cy - 8);
    ctx.fillStyle = '#a0a0c0'; ctx.font = '11px Inter'; ctx.fillText('总计', cx, cy + 12);
    // Legend
    const lx = w * 0.72; let ly = 30;
    labels.forEach((l, i) => {
        ctx.fillStyle = colors[i]; ctx.fillRect(lx, ly, 10, 10);
        ctx.fillStyle = '#a0a0c0'; ctx.font = '11px Inter'; ctx.textAlign = 'left';
        ctx.fillText(`${l} (${data[i]})`, lx + 16, ly + 9);
        ly += 22;
    });
}

function drawBarChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const top5 = Store.partners.sort((a, b) => b.historyCount - a.historyCount).slice(0, 5);
    if (top5.length === 0) { ctx.fillStyle = '#6a6a8e'; ctx.font = '13px Inter'; ctx.textAlign = 'center'; ctx.fillText('暂无数据', w / 2, h / 2); return; }
    const maxVal = Math.max(...top5.map(p => p.historyCount), 1);
    const barW = 40, gap = (w - top5.length * barW) / (top5.length + 1);
    const colors = ['#6c5ce7', '#0984e3', '#00b894', '#fdcb6e', '#e17055'];
    top5.forEach((p, i) => {
        const x = gap + i * (barW + gap);
        const barH = (p.historyCount / maxVal) * (h - 60);
        const y = h - 30 - barH;
        const grad = ctx.createLinearGradient(x, y, x, h - 30);
        grad.addColorStop(0, colors[i]); grad.addColorStop(1, colors[i] + '44');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]); ctx.fill();
        ctx.fillStyle = '#e8e8f0'; ctx.font = 'bold 13px Inter'; ctx.textAlign = 'center';
        ctx.fillText(p.historyCount, x + barW / 2, y - 8);
        ctx.fillStyle = '#a0a0c0'; ctx.font = '10px Inter';
        const name = p.companyName.length > 5 ? p.companyName.slice(0, 5) + '..' : p.companyName;
        ctx.fillText(name, x + barW / 2, h - 14);
    });
}

// ---- Form Submission ----
document.getElementById('demand-form').addEventListener('submit', e => {
    e.preventDefault();
    const types = Array.from(document.querySelectorAll('#form-project-types input:checked')).map(c => c.value);
    if (types.length === 0) { showToast('提示', '请至少选择一个项目类型', 'warning'); return; }
    const dem = {
        id: genId('REQ'), customerName: document.getElementById('form-customer-name').value.trim(),
        industry: document.getElementById('form-customer-industry').value, projectName: document.getElementById('form-project-name').value.trim(),
        projectTypes: types, budget: document.getElementById('form-budget').value, deadline: document.getElementById('form-deadline').value,
        source: document.getElementById('form-demand-source').value, description: document.getElementById('form-description').value,
        painpoints: document.getElementById('form-painpoints').value, status: '待分析', owner: '待分配',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    Store.demands.push(dem);
    addActivity(`新需求「${dem.projectName}」通过表单提交，客户：${dem.customerName} `, '#6c5ce7');
    saveData(); e.target.reset();
    showToast('🎉 需求提交成功', `编号：${dem.id}，产品同事将尽快进行分析`, 'success');
    switchPage('demands');
});

// ---- Sample Data ----
function initSampleData() {
    Store.counters = { demand: 8, analysis: 5, partner: 12, matching: 4 };
    const now = Date.now();
    Store.demands = [
        { id: 'REQ-20260205-001', category: '项目需求', customerName: '中建科技', industry: '制造', projectName: '智慧工厂MES系统', projectTypes: ['软件开发', '系统集成'], budget: '100-300万', deadline: '2026-06-30', source: '销售转来', description: '基于工业4.0理念，建设智慧工厂MES系统', painpoints: '生产过程不透明，质量追溯困难', status: '已签约', owner: '张伟', createdAt: new Date(now - 7 * 86400000).toISOString(), updatedAt: new Date(now - 2 * 86400000).toISOString() },
        { id: 'REQ-20260206-002', category: '万象企业版', customerName: '平安银行', industry: '金融', projectName: '智能风控平台', projectTypes: ['软件开发'], budget: '300万以上', deadline: '2026-08-31', source: '客户直接联系', description: '构建基于AI的智能风控平台', painpoints: '风控规则维护困难，误报率高', status: '已推荐', owner: '李明', createdAt: new Date(now - 6 * 86400000).toISOString(), updatedAt: new Date(now - 1 * 86400000).toISOString() },
        { id: 'REQ-20260207-003', category: '项目需求', customerName: '深圳教育局', industry: '政府', projectName: '智慧教育管理平台', projectTypes: ['软件开发', '咨询服务'], budget: '50-100万', deadline: '2026-05-15', source: '市场活动', description: '区域教育资源管理和教学质量监测平台', painpoints: '各校系统独立，数据无法互通', status: '已完成分析', owner: '王芳', createdAt: new Date(now - 5 * 86400000).toISOString(), updatedAt: new Date(now - 86400000).toISOString() },
        { id: 'REQ-20260208-004', category: '万象企业版', customerName: '海尔集团', industry: '制造', projectName: '供应链协同系统', projectTypes: ['系统集成', '联合研发'], budget: '100-300万', deadline: '2026-07-31', source: '合作伙伴推荐', description: '基于区块链的供应链协同管理系统', painpoints: '供应链信息不对称，协作效率低', status: '分析中', owner: '赵强', createdAt: new Date(now - 3 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
        { id: 'REQ-20260209-005', category: '项目需求', customerName: '叮当健康', industry: '医疗', projectName: '远程诊疗平台', projectTypes: ['软件开发'], budget: '50-100万', deadline: '2026-09-30', source: '销售转来', description: '面向基层医疗机构的远程诊疗服务平台', painpoints: '基层医疗资源不足，诊疗水平参差', status: '待分析', owner: '待分配', createdAt: new Date(now - 1 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
        { id: 'REQ-20260209-006', category: '万象企业版', customerName: '永辉超市', industry: '零售', projectName: '会员精准营销系统', projectTypes: ['软件开发', '咨询服务'], budget: '10-50万', deadline: '2026-04-30', source: '销售转来', description: '基于大数据的会员精准营销系统', painpoints: '会员活跃度低，营销效果难衡量', status: '待分析', owner: '待分配', createdAt: new Date(now - 86400000 / 2).toISOString(), updatedAt: new Date().toISOString() },
    ];
    Store.analyses = [
        { id: 'PA-20260206-001', demandId: 'REQ-20260205-001', clarity: 4, complexity: '高', productForm: '定制开发', estimatedDays: 90, analyst: '陈产品', coreFunctions: '生产调度、质量追溯、设备管理、数据采集', conclusion: '需求清晰，技术可行，建议选择有MES经验的伙伴', techStack: ['Java', 'Vue', 'MySQL'], industryReq: '必须', deliverables: '系统+文档', status: '已完成', analysisDate: new Date(now - 5 * 86400000).toISOString() },
        { id: 'PA-20260207-002', demandId: 'REQ-20260206-002', clarity: 5, complexity: '高', productForm: '联合解决方案', estimatedDays: 120, analyst: '刘产品', coreFunctions: '风险模型、规则引擎、实时监控、报表分析', conclusion: '技术难度大，需AI能力强的伙伴', techStack: ['Python', 'Java', 'TensorFlow'], industryReq: '必须', deliverables: '平台+模型', status: '已完成', analysisDate: new Date(now - 4 * 86400000).toISOString() },
        { id: 'PA-20260208-003', demandId: 'REQ-20260207-003', clarity: 3, complexity: '中', productForm: '标准产品', estimatedDays: 45, analyst: '陈产品', coreFunctions: '数据汇聚、教学监测、资源共享、决策支持', conclusion: '可基于现有教育平台二次开发', techStack: ['Vue', 'Node.js', 'MongoDB'], industryReq: '加分项', deliverables: '平台+培训', status: '已完成', analysisDate: new Date(now - 2 * 86400000).toISOString() },
    ];
    Store.partners = [
        { id: 'PT-001', companyName: '东软集团', companySize: '200人以上', industries: ['制造', '金融'], skills: ['Java', 'Python', 'Vue', 'MES', 'ERP'], projectTypes: ['软件开发', '系统集成'], historyCount: 12, qualityScore: 5, availableStaff: 15, schedule: '充足', cooperationStatus: '活跃', contact: '王总', phone: '13800001111', notes: '' },
        { id: 'PT-002', companyName: '中软国际', companySize: '200人以上', industries: ['政府', '金融'], skills: ['Java', '.NET', 'Oracle', '大数据'], projectTypes: ['软件开发', '咨询服务'], historyCount: 8, qualityScore: 4, availableStaff: 10, schedule: '紧张', cooperationStatus: '活跃', contact: '李总', phone: '13800002222', notes: '' },
        { id: 'PT-003', companyName: '深信科技', companySize: '51-200人', industries: ['制造', '零售'], skills: ['Python', 'AI', 'TensorFlow', '大数据'], projectTypes: ['软件开发', '联合研发'], historyCount: 5, qualityScore: 4, availableStaff: 6, schedule: '充足', cooperationStatus: '活跃', contact: '张总', phone: '13800003333', notes: '' },
        { id: 'PT-004', companyName: '博彦科技', companySize: '200人以上', industries: ['金融', '医疗'], skills: ['Java', 'Python', 'React', '风控系统'], projectTypes: ['软件开发'], historyCount: 7, qualityScore: 5, availableStaff: 8, schedule: '充足', cooperationStatus: '活跃', contact: '赵总', phone: '13800004444', notes: '' },
        { id: 'PT-005', companyName: '润和软件', companySize: '51-200人', industries: ['教育', '政府'], skills: ['Vue', 'Node.js', 'MongoDB', '小程序'], projectTypes: ['软件开发', '产品代理'], historyCount: 3, qualityScore: 3, availableStaff: 4, schedule: '紧张', cooperationStatus: '活跃', contact: '孙总', phone: '13800005555', notes: '' },
        { id: 'PT-006', companyName: '文思海辉', companySize: '200人以上', industries: ['金融', '制造'], skills: ['Java', 'SAP', 'Oracle', '系统集成'], projectTypes: ['系统集成', '咨询服务'], historyCount: 6, qualityScore: 4, availableStaff: 0, schedule: '已满', cooperationStatus: '活跃', contact: '周总', phone: '13800006666', notes: '' },
    ];
    Store.matchings = [
        // MES系统 - 3个推荐，东软已确认（双方评分后选定）
        { id: 'MC-20260207-001', groupId: 'GRP-MES', demandId: 'REQ-20260205-001', partnerId: 'PT-001', rank: 1, totalScore: 92, techScore: 9, industryScore: 10, scaleScore: 9, scheduleScore: 9, qualityScore: 10, reason: '东软在MES领域有丰富经验，技术实力强', risks: '项目规模大', cooperationMode: '联合交付', matcher: '生态负责人', matchDate: new Date(now - 4 * 86400000).toISOString(), status: '已签约', productScore: 9, presalesScore: 9, productComment: '技术方案成熟，团队经验丰富', presalesComment: '客户沟通顺畅，报价合理', productScoreBy: '刘产品', presalesScoreBy: '陈售前', productScoreTime: new Date(now - 3 * 86400000).toISOString(), presalesScoreTime: new Date(now - 3 * 86400000).toISOString() },
        { id: 'MC-20260207-002', groupId: 'GRP-MES', demandId: 'REQ-20260205-001', partnerId: 'PT-003', rank: 2, totalScore: 75, techScore: 7, industryScore: 8, scaleScore: 7, scheduleScore: 8, qualityScore: 8, reason: '深信科技有制造业经验', risks: '规模偏小', cooperationMode: '能力互补', matcher: '生态负责人', matchDate: new Date(now - 4 * 86400000).toISOString(), status: '已拒绝', productScore: 6, presalesScore: 7, productComment: '技术能力一般', presalesComment: '团队规模不够', productScoreBy: '刘产品', presalesScoreBy: '陈售前', productScoreTime: new Date(now - 3 * 86400000).toISOString(), presalesScoreTime: new Date(now - 3 * 86400000).toISOString() },
        { id: 'MC-20260207-003', groupId: 'GRP-MES', demandId: 'REQ-20260205-001', partnerId: 'PT-006', rank: 3, totalScore: 68, techScore: 7, industryScore: 7, scaleScore: 8, scheduleScore: 5, qualityScore: 8, reason: '文思海辉有系统集成能力', risks: '档期已满', cooperationMode: '总分包', matcher: '生态负责人', matchDate: new Date(now - 4 * 86400000).toISOString(), status: '已拒绝', productScore: 5, presalesScore: 4, productComment: '档期无法配合', presalesComment: '交付风险较高', productScoreBy: '刘产品', presalesScoreBy: '陈售前', productScoreTime: new Date(now - 3 * 86400000).toISOString(), presalesScoreTime: new Date(now - 3 * 86400000).toISOString() },
        // 风控平台 - 3个推荐，产品已评分，等待售前评分
        { id: 'MC-20260208-004', groupId: 'GRP-RISK', demandId: 'REQ-20260206-002', partnerId: 'PT-004', rank: 1, totalScore: 88, techScore: 9, industryScore: 9, scaleScore: 8, scheduleScore: 9, qualityScore: 10, reason: '博彦在金融风控有成熟方案，AI能力突出', risks: '项目周期长', cooperationMode: '联合交付', matcher: '生态负责人', matchDate: new Date(now - 2 * 86400000).toISOString(), status: '产品已评分', productScore: 9, presalesScore: null, productComment: 'AI能力出众，金融风控案例丰富', presalesComment: null, productScoreBy: '刘产品', presalesScoreBy: null, productScoreTime: new Date(now - 86400000).toISOString(), presalesScoreTime: null },
        { id: 'MC-20260208-005', groupId: 'GRP-RISK', demandId: 'REQ-20260206-002', partnerId: 'PT-001', rank: 2, totalScore: 80, techScore: 8, industryScore: 8, scaleScore: 9, scheduleScore: 8, qualityScore: 10, reason: '东软综合实力强，金融行业经验丰富', risks: '当前MES项目占用资源', cooperationMode: '联合交付', matcher: '生态负责人', matchDate: new Date(now - 2 * 86400000).toISOString(), status: '产品已评分', productScore: 7, presalesScore: null, productComment: '综合实力好但当前资源紧张', presalesComment: null, productScoreBy: '刘产品', presalesScoreBy: null, productScoreTime: new Date(now - 86400000).toISOString(), presalesScoreTime: null },
        { id: 'MC-20260208-006', groupId: 'GRP-RISK', demandId: 'REQ-20260206-002', partnerId: 'PT-002', rank: 3, totalScore: 72, techScore: 7, industryScore: 8, scaleScore: 8, scheduleScore: 6, qualityScore: 8, reason: '中软国际在金融领域有案例', risks: '档期紧张', cooperationMode: '总分包', matcher: '生态负责人', matchDate: new Date(now - 2 * 86400000).toISOString(), status: '已推荐', productScore: null, presalesScore: null, productComment: null, presalesComment: null, productScoreBy: null, presalesScoreBy: null, productScoreTime: null, presalesScoreTime: null },
    ];
    Store.activities = [
        { text: '需求「智慧工厂MES系统」已签约，伙伴：东软集团', color: '#00b894', time: new Date(now - 2 * 86400000).toISOString() },
        { text: '伙伴匹配完成：智能风控平台 → 博彦科技（匹配度85分）', color: '#0984e3', time: new Date(now - 2 * 86400000).toISOString() },
        { text: '产品分析完成：智慧教育管理平台', color: '#0984e3', time: new Date(now - 2 * 86400000).toISOString() },
        { text: '新需求「远程诊疗平台」已创建，客户：叮当健康', color: '#6c5ce7', time: new Date(now - 86400000).toISOString() },
        { text: '新需求「会员精准营销系统」已创建，客户：永辉超市', color: '#6c5ce7', time: new Date(now - 86400000 / 2).toISOString() },
        { text: '需求「供应链协同系统」开始分析', color: '#fdcb6e', time: new Date(now - 3 * 86400000).toISOString() },
    ];
    saveData();
}


// ---- Gantt Chart ----
let ganttScale = 'month'; // 'month' or 'week'

function getNextDate(date, scale) {
    const d = new Date(date);
    if (scale === 'month') {
        return new Date(d.getFullYear(), d.getMonth() + 1, 1);
    } else {
        d.setDate(d.getDate() + 7);
        return d;
    }
}

function renderGantt() {
    ganttScale = document.getElementById('gantt-view-filter')?.value || 'month';
    const statusFilter = document.getElementById('gantt-status-filter')?.value;

    // Filter Data
    let demands = Store.demands.filter(d => !statusFilter || d.status === statusFilter);
    if (demands.length === 0 && Store.demands.length > 0 && !statusFilter) demands = Store.demands;

    // Determine Time Range
    const dates = demands.flatMap(d => [new Date(d.createdAt), new Date(d.deadline || new Date(d.createdAt).getTime() + 30 * 86400000)]);
    if (dates.length === 0) dates.push(new Date());

    // Buffer: Start - 15 days, End + 30 days
    let minDate = new Date(Math.min(...dates));
    minDate.setDate(minDate.getDate() - 15);
    let maxDate = new Date(Math.max(...dates));
    maxDate.setDate(maxDate.getDate() + 45);

    // Normalize minDate to start of month/week
    minDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);

    const pxPerDay = ganttScale === 'month' ? 10 : 30;
    const totalDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);
    const totalWidth = totalDays * pxPerDay;

    // Render Header
    const headerEl = document.getElementById('gantt-timeline-header');
    headerEl.innerHTML = '';

    let currentDate = new Date(minDate);
    const gridLines = [];

    while (currentDate < maxDate) {
        const nextDate = getNextDate(currentDate, ganttScale);
        const daysInStep = (nextDate - currentDate) / (1000 * 60 * 60 * 24);
        const width = daysInStep * pxPerDay;

        const cell = document.createElement('div');
        cell.className = 'gantt-time-cell';
        if (ganttScale === 'month' && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()) {
            cell.classList.add('current-month');
        }
        cell.style.width = width + 'px';
        cell.textContent = ganttScale === 'month'
            ? `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`
            : `${currentDate.getMonth() + 1}/${currentDate.getDate()}`;
        headerEl.appendChild(cell);

        // Grid line position
        // Actually grid lines should be rendered in the body per tick

        currentDate = nextDate;
    }

    // Render Body
    const bodyEl = document.getElementById('gantt-body');
    bodyEl.innerHTML = '';

    // 1. Grid Background
    const gridEl = document.createElement('div');
    gridEl.className = 'gantt-grid-lines';
    gridEl.style.width = (totalWidth + 240) + 'px';
    gridEl.style.paddingLeft = '240px';

    let gridDate = new Date(minDate);
    while (gridDate < maxDate) {
        const nextDate = getNextDate(gridDate, ganttScale);
        const daysInStep = (nextDate - gridDate) / (1000 * 60 * 60 * 24);
        const width = daysInStep * pxPerDay;

        const line = document.createElement('div');
        line.className = 'gantt-grid-line';
        line.style.width = width + 'px';
        gridEl.appendChild(line);
        gridDate = nextDate;
    }
    bodyEl.appendChild(gridEl);

    // 2. Rows
    demands.forEach(d => {
        const row = document.createElement('div');
        row.className = 'gantt-row ' + `status-${getStatusClass(d.status)}`;

        // Sidebar Content
        const sidebar = document.createElement('div');
        sidebar.className = 'gantt-row-sidebar';
        sidebar.innerHTML = `
            <div style="overflow:hidden;text-overflow:ellipsis">
                <div style="font-weight:500">${d.projectName}</div>
                <div style="font-size:11px;color:var(--text-tertiary)">${d.customerName}</div>
            </div>
        `;
        sidebar.title = d.projectName;

        // Timeline Content
        const timeline = document.createElement('div');
        timeline.className = 'gantt-row-timeline';
        timeline.style.width = totalWidth + 'px';

        // Bar
        const start = new Date(d.createdAt);
        const end = d.deadline ? new Date(d.deadline) : new Date(start.getTime() + 30 * 86400000);

        const diffStart = (start - minDate) / (1000 * 60 * 60 * 24);
        const duration = (end - start) / (1000 * 60 * 60 * 24);

        if (duration > 0 && diffStart + duration > 0) {
            const left = Math.max(0, diffStart * pxPerDay);
            const w = Math.max(20, duration * pxPerDay); // min width 20px

            const barWrap = document.createElement('div');
            barWrap.className = 'gantt-bar-wrapper';
            barWrap.style.left = left + 'px';
            barWrap.style.width = w + 'px';
            barWrap.onclick = () => viewDemandDetail(d.id);

            barWrap.innerHTML = `
                <div class="gantt-bar-content">
                   ${Math.round(duration)}天 · ${d.status}
                </div>
            `;
            barWrap.title = `${d.projectName} (${formatDate(start)} ~ ${formatDate(end)})`;

            timeline.appendChild(barWrap);
        }

        row.appendChild(sidebar);
        row.appendChild(timeline);
        bodyEl.appendChild(row);
    });

    // 3. Today Marker
    const today = new Date();
    if (today >= minDate && today <= maxDate) {
        const diffToday = (today - minDate) / (1000 * 60 * 60 * 24);
        const left = diffToday * pxPerDay;

        const marker = document.createElement('div');
        marker.className = 'gantt-today-line';
        marker.style.left = left + 240 + 'px'; // + sidebar width IS WRONG.
        // The marker should be inside a container that scrolls with the timeline
        // The body scroll includes the sidebar? 
        // No, header has sidebar-col separated.
        // Body has rows. Each row has sidebar + timeline.
        // If I append marker strictly to bodyEl, it needs to be absolute over everything.
        // But bodyEl scrolls. 
        // Better: Append marker to the gridEl which is absolute 0,0, but gridEl is inside bodyEl.
        // Wait, bodyEl is flex col.

        // Let's attach to the grid background container which spans full height?
        // Actually, CSS wise, .gantt-grid-lines is absolute top 0 bottom 0 inside .gantt-body (relative).
        // .gantt-body has sidebar (sticky).
        // If I put marker in .gantt-grid-lines, it will scroll with content but be behind rows?
        // Z-index.

        const markerLine = document.createElement('div');
        markerLine.className = 'gantt-today-line';
        markerLine.style.left = (left + 240) + 'px'; // Offset for sticky sidebar?
        // Wait, .gantt-grid-lines is `left: 0`. But sidebar is in flow.
        // Sidebar is 240px wide.
        // The grid lines logic I implemented: `gridEl.style.width = totalWidth`.
        // BUT my rows have `sidebar` (240px) then `timeline` (flex 1).
        // My grid lines are just divs...
        // Actually, looking at my CSS:
        // .gantt-body is flex col.
        // .gantt-grid-lines is absolute.
        // If .gantt-row contains sidebar (240px), then the timeline *starts* at 240px.
        // So grid lines should start at 240px too?
        // OR, I should put grid lines inside `timeline` part of rows? No, that's heavy.

        // Correction:
        // The Header has `gantt-sidebar-col` (240px) and `gantt-timeline-header` (flex 1).
        // The Rows have `gantt-row-sidebar` (240px) and `gantt-row-timeline` (flex 1).

        // If I want a grid background that spans all rows, it should be in `gantt-body`.
        // But `gantt-body` scrolls.
        // And `gantt-row` is in flow.
        // The transparency of rows allows background to show? Yes checking CSS...
        // `.gantt-row` has no background (default), hover has background.
        // So `gantt-grid-lines` can be behind.
        // BUT `gantt-grid-lines` needs to respect the 240px sidebar offset.

        gridEl.style.paddingLeft = '240px';
        // And the lines inside.

        // Re-adjusting marker logic:
        markerLine.style.left = (left + 240) + 'px';
        markerLine.innerHTML = `<div class="gantt-today-label">Today</div>`;
        gridEl.appendChild(markerLine);
    }
}

// Sync Scrolling
document.getElementById('gantt-body').addEventListener('scroll', function () {
    document.getElementById('gantt-timeline-header').scrollLeft = this.scrollLeft;
});

document.getElementById('gantt-view-filter')?.addEventListener('change', renderGantt);
document.getElementById('gantt-status-filter')?.addEventListener('change', renderGantt);
document.getElementById('btn-gantt-today')?.addEventListener('click', () => {
    // Scroll to Today
    // Find today marker position?
    // Simplified: just render defaults.
    renderGantt();
    // TODO: Implement scroll to today
});

// ---- Init ----
loadData();
switchPage('dashboard');
