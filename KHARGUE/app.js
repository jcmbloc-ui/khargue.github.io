const projects = [];

const formatMoney = value => new Intl.NumberFormat('fr-FR').format(value) + ' GNF';
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
const fieldLabels = { campaignType: 'Type de campagne', name: 'Porteur / demandeur', phone: 'Téléphone', email: 'Email', birthDate: 'Date de naissance', gender: 'Sexe', project: 'Projet', category: 'Domaine', otherCategory: 'Domaine précisé', amount: 'Montant demandé', prefecture: 'Préfecture / résidence', subprefecture: 'Sous-préfecture / commune', neighborhood: 'Quartier', projectStatus: 'Situation du projet', coordinates: 'Coordonnées', description: 'Description du projet', photo: 'Photo ou logo', residence: 'Lieu de résidence', beneficiary: 'Bénéficiaire', beneficiaryContact: 'Contact du bénéficiaire', beneficiaryResidence: 'Résidence du bénéficiaire', campaignReason: 'Motif de la campagne' };
fieldLabels.administrativeRegion = 'Région administrative';
function renderSubmissionDetails(submission) {
  const internalFields = new Set(['id', 'raised', 'status', 'accountPassword', 'accountCreatedAt']);
  return Object.entries(submission).filter(([key, value]) => !internalFields.has(key) && value !== '' && value !== null && typeof value !== 'undefined').map(([key, value]) => {
    const label = fieldLabels[key] || key;
    if (key === 'photo' && typeof value === 'string' && value.startsWith('data:image/')) return `<div class="review-field"><span>${label}</span><img class="submission-photo-preview" src="${escapeHtml(value)}" alt="Photo du projet"></div>`;
    return `<div class="review-field"><span>${escapeHtml(label)}</span><b>${key === 'amount' ? formatMoney(value) : escapeHtml(value)}</b></div>`;
  }).join('');
}
const projectGrid = document.querySelector('#projectGrid');
const projectSearch = document.querySelector('#projectSearch');
const projectCategorySelect = document.querySelector('#projectCategory');
const projectLetterSelect = document.querySelector('#projectLetter');
const toast = document.querySelector('#toast');
const storageKey = 'khargue-data';
const projectRaisedKey = 'khargue-project-raised';
const rememberLoginKey = 'khargue-remember-login';
const defaultPartners = [{ name: 'Fondation Guinée', description: 'Impact social', initials: 'FG' }, { name: 'Afrique Growth', description: 'Accompagnement', initials: 'AG' }, { name: 'Nimba Capital', description: 'Finance solidaire', initials: 'NC' }, { name: 'Orange Guinée', description: 'Partenaire paiement', initials: '24' }, { name: 'Université de Conakry', description: 'Transmission', initials: 'U' }, { name: 'Croix-Rouge', description: 'Action locale', initials: 'CR' }];
const defaultData = { submissions: [], contributions: [], content: [], comments: [], gallery: [], partners: defaultPartners.map((partner, index) => ({ ...partner, id: index + 1, logo: '' })), pages: { about: { eyebrow: 'Qui sommes-nous', title: 'Une plateforme née pour rassembler.', body: 'Présentez ici KHARGUE, sa mission, son histoire et les personnes qui la font vivre.', image: '' }, services: { eyebrow: 'Nos services', title: 'Des solutions pour faire grandir les projets.', body: 'Décrivez ici les services proposés aux porteurs de projets et aux contributeurs.', image: '' }, successes: { eyebrow: 'Nos réussites', title: 'Des projets qui changent le quotidien.', body: 'Racontez ici les projets financés, leurs résultats et leurs impacts dans les communautés.', image: '' } }, portfolio: { heroTitle: 'Faites de vos idées, une palpable réalité.', heroSubtitle: "KHARGUE connecte les porteurs de projets guinéens avec les contributeurs pour l'épanouissement socioéconomique des populations.", accentColor: '#9a7210', backgroundColor: '#bfe3ed' }, users: [{ email: 'admin@khargue.gn', password: 'admin2026', role: 'admin', name: 'Administrateur KHARGUE' }] };
const loadData = () => {
  const data = JSON.parse(localStorage.getItem(storageKey) || JSON.stringify(defaultData));
  data.gallery = Array.isArray(data.gallery) ? data.gallery : [];
  if (!data.gallery.length && !data.galleryInitialized) data.gallery = defaultGallery.map(item => ({ ...item }));
  data.galleryInitialized = true;
  data.comments = Array.isArray(data.comments) ? data.comments : [];
  data.partners = Array.isArray(data.partners) ? data.partners : defaultPartners.map((partner, index) => ({ ...partner, id: index + 1, logo: '' }));
  data.pages = { ...defaultData.pages, ...(data.pages || {}) };
  data.portfolio = { ...defaultData.portfolio, ...(data.portfolio || {}) };
  data.users = data.users.filter(user => user.role !== 'visitor');
  localStorage.setItem(storageKey, JSON.stringify(data));
  return data;
};
const saveData = data => localStorage.setItem(storageKey, JSON.stringify(data));
let accountRole = null;
let loginRole = 'admin';
let currentContributionProject = null;
let recoveryCodeNotice = '';
const accountPasswordValues = new Map();

function generateRecoveryCode() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
}

const defaultGallery = [
  { id: 1, title: 'Projet agricole financé à Kindia', image: 'https://images.unsplash.com/photo-1592982537447-6f2a6a0a3a11?auto=format&fit=crop&w=1000&q=85' },
  { id: 2, title: 'Projet éducatif financé à Kouroussa', image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1000&q=85' },
  { id: 3, title: 'Projet culturel financé à Labé', image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=85' }
];

function getAvailableProjects() {
  const raisedTotals = JSON.parse(localStorage.getItem(projectRaisedKey) || '{}');
  const approvedProjects = loadData().submissions.filter(submission => submission.status === 'approved').map(submission => ({
    id: submission.id,
    category: submission.category,
    title: submission.project,
    location: submission.prefecture,
    image: submission.photo || 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=85',
    raised: raisedTotals[submission.id] ?? submission.raised ?? 0,
    goal: submission.amount,
    supporters: 0,
    description: submission.description || 'Projet validé par KHARGUE.',
    holder: submission.name,
    prefecture: submission.prefecture,
    neighborhood: submission.neighborhood
  }));
  return projects.map(project => ({ ...project, raised: raisedTotals[project.id] ?? project.raised })).concat(approvedProjects);
}

const normalizeProjectText = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr-FR').trim();

function renderProjects() {
  const availableProjects = getAvailableProjects();
  const selectedCategory = projectCategorySelect.value;
  const selectedLetter = projectLetterSelect.value;
  projectCategorySelect.innerHTML = `<option value="all">Tous les domaines</option>${projectCategories.map(category => `<option value="${category.value}">${category.label}</option>`).join('')}`;
  projectCategorySelect.value = projectCategories.some(category => category.value === selectedCategory) ? selectedCategory : 'all';
  projectLetterSelect.innerHTML = '<option value="">Toutes les lettres</option>' + Array.from({ length: 26 }, (_, index) => `<option value="${String.fromCharCode(65 + index)}">${String.fromCharCode(65 + index)}</option>`).join('');
  projectLetterSelect.value = selectedLetter;
  const searchTerm = normalizeProjectText(projectSearch.value);
  const normalizedLetter = normalizeProjectText(selectedLetter);
  const visibleProjects = availableProjects
    .filter(project => projectCategorySelect.value === 'all' || (projectCategorySelect.value === 'autres' ? project.category === 'autres' || !projectCategories.some(category => category.value !== 'autres' && category.value === project.category) : project.category === projectCategorySelect.value))
    .filter(project => !searchTerm || normalizeProjectText(project.title).includes(searchTerm))
    .filter(project => !normalizedLetter || normalizeProjectText(project.title).startsWith(normalizedLetter));
  if (!visibleProjects.length) {
    projectGrid.innerHTML = '<div class="empty-state project-empty">Aucun projet ne correspond à ces critères.</div>';
    return;
  }
  projectGrid.innerHTML = visibleProjects.map(project => {
    const percentage = Math.min(100, Math.round((project.raised / project.goal) * 100));
    return `<article class="project-card">
      <div class="project-image"><img src="${project.image}" alt="${project.title}" loading="lazy"><span class="project-tag">${project.category}</span></div>
      <div class="project-info"><div class="project-location"><i data-lucide="map-pin"></i>${project.location}</div><h3>${project.title}</h3><div class="progress-line"><span style="width:${percentage}%"></span></div><div class="progress-data"><span><strong>${formatMoney(project.raised)}</strong> collectés</span><span>${percentage}%</span></div><div class="card-actions"><button class="details-btn" data-details="${project.id}">Voir les détails</button><button class="contribute-btn" data-contribute="${project.id}">Contribuer <i data-lucide="arrow-up-right"></i></button></div></div>
    </article>`;
  }).join('');
  lucide.createIcons();
}

function renderComments() {
  const list = document.querySelector('#commentsList');
  if (!list) return;
  const comments = loadData().comments.filter(comment => comment.status === 'published');
  list.innerHTML = comments.length ? comments.map(comment => `<article class="comment-card"><span class="comment-mark">“</span><p>${escapeHtml(comment.body)}</p><b>${escapeHtml(comment.name)}</b><small>${new Date(comment.createdAt).toLocaleDateString('fr-FR')}</small></article>`).join('') : '<div class="empty-state">Soyez la première personne à partager votre avis.</div>';
}

function renderPartners() {
  const grid = document.querySelector('#partnerGrid');
  if (!grid) return;
  const partners = loadData().partners;
  grid.innerHTML = partners.map(partner => `<article class="partner-logo">${partner.logo ? `<img src="${escapeHtml(partner.logo)}" alt="Logo ${escapeHtml(partner.name)}">` : `<span>${escapeHtml(partner.initials || partner.name.slice(0, 2).toUpperCase())}</span>`}<b>${escapeHtml(partner.name)}</b>${partner.description ? `<small>${escapeHtml(partner.description)}</small>` : ''}</article>`).join('');
}

function renderGallery() {
  const gallery = document.querySelector('#successGallery');
  if (!gallery) return;
  gallery.innerHTML = loadData().gallery.map(item => `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy">`).join('');
}

async function renderRegionalMap() {
  const map = document.querySelector('#regionalMap');
  if (!map) return;
  const regions = [
    { code: 'GN-B', sourceName: 'Boke', name: 'Boké', color: '#d85b45', prefectures: ['Boke', 'Boffa', 'Fria', 'Gaoual', 'Koundara'] },
    { code: 'GN-C', sourceName: 'Conakry', name: 'Conakry', color: '#316c9b', prefectures: ['Conakry'] },
    { code: 'GN-F', sourceName: 'Faranah', name: 'Faranah', color: '#e4a83b', prefectures: ['Faranah', 'Dabola', 'Dinguiraye', 'Kissidougou'] },
    { code: 'GN-K', sourceName: 'Kankan', name: 'Kankan', color: '#477d54', prefectures: ['Kankan', 'Kerouane', 'Kouroussa', 'Mandiana', 'Siguiri'] },
    { code: 'GN-D', sourceName: 'Kindia', name: 'Kindia', color: '#9a5b84', prefectures: ['Kindia', 'Coyah', 'Dubreka', 'Forecariah', 'Telemele'] },
    { code: 'GN-L', sourceName: 'Labe', name: 'Labé', color: '#5d91a5', prefectures: ['Labe', 'Koubia', 'Lelouma', 'Mali', 'Tougue'] },
    { code: 'GN-M', sourceName: 'Mamou', name: 'Mamou', color: '#b8783f', prefectures: ['Mamou', 'Dalaba', 'Pita'] },
    { code: 'GN-N', sourceName: 'Nzerekore', name: 'Nzérékoré', color: '#83953e', prefectures: ['Nzerekore', 'Beyla', 'Gueckedou', 'Lola', 'Macenta', 'Yomou'] }
  ];
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const regionForSubmission = submission => {
    const selectedRegion = regions.find(region => region.code === submission.administrativeRegion);
    if (selectedRegion) return selectedRegion;
    const location = normalize([submission.prefecture, submission.residence, submission.subprefecture].filter(Boolean).join(' '));
    return regions.find(region => region.prefectures.some(prefecture => location.includes(normalize(prefecture))));
  };
  const getRegionStats = region => {
    const data = loadData();
    const submissions = data.submissions.filter(submission => submission.status === 'approved' && regionForSubmission(submission)?.code === region.code);
    const raisedTotals = JSON.parse(localStorage.getItem(projectRaisedKey) || '{}');
    const funded = submissions.filter(submission => Number(submission.amount) > 0 && Number(raisedTotals[submission.id] ?? submission.raised ?? 0) >= Number(submission.amount)).length;
    return { submitted: submissions.length, funded };
  };
  try {
    const geojson = window.guineaRegions;
    if (!geojson?.features?.length) throw new Error('Regional data unavailable');
    const width = 640;
    const height = 650;
    const padding = 7;
    const features = geojson.features;
    const points = [];
    const collectPoints = coordinates => {
      if (typeof coordinates[0] === 'number') points.push(coordinates);
      else coordinates.forEach(collectPoints);
    };
    features.forEach(feature => collectPoints(feature.geometry.coordinates));
    const longitudes = points.map(point => point[0]);
    const latitudes = points.map(point => point[1]);
    const minLongitude = Math.min(...longitudes);
    const maxLongitude = Math.max(...longitudes);
    const minLatitude = Math.min(...latitudes);
    const maxLatitude = Math.max(...latitudes);
    const scale = Math.min((width - padding * 2) / (maxLongitude - minLongitude), (height - padding * 2) / (maxLatitude - minLatitude));
    const offsetX = (width - (maxLongitude - minLongitude) * scale) / 2;
    const offsetY = (height - (maxLatitude - minLatitude) * scale) / 2;
    const project = ([longitude, latitude]) => [offsetX + (longitude - minLongitude) * scale, offsetY + (maxLatitude - latitude) * scale];
    const makePath = feature => {
      const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
      return polygons.flatMap(polygon => polygon.map(ring => ring.map((point, index) => {
        const [x, y] = project(point);
        return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
      }).join(' ') + ' Z')).join(' ');
    };
    map.innerHTML = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" aria-label="Carte des régions administratives de Guinée">${features.map(feature => {
      const region = regions.find(item => item.sourceName === feature.properties.shapeName);
      if (!region) return '';
      const stats = getRegionStats(region);
      return `<path d="${makePath(feature)}" fill="${region.color}" data-region="${region.code}" tabindex="0" role="button" aria-label="${escapeHtml(region.name)} : ${stats.submitted} projets soumis, ${stats.funded} projets financés"><title>${escapeHtml(region.name)}</title></path>`;
    }).join('')}</svg><div class="region-tooltip" role="status" aria-live="polite" hidden></div>`;
    const tooltip = map.querySelector('.region-tooltip');
    map.querySelectorAll('[data-region]').forEach(path => {
      const showStats = () => {
        const region = regions.find(item => item.code === path.dataset.region);
        const stats = getRegionStats(region);
        path.setAttribute('aria-label', `${region.name} : ${stats.submitted} projets soumis, ${stats.funded} projets financés`);
        tooltip.innerHTML = `<strong>${escapeHtml(region.name)}</strong><ul><li><span>Projets soumis</span><b>${stats.submitted}</b></li><li><span>Projets financés</span><b>${stats.funded}</b></li></ul>`;
        tooltip.hidden = false;
        map.querySelectorAll('[data-region]').forEach(item => item.classList.toggle('is-active', item === path));
      };
      path.addEventListener('pointerenter', showStats);
      path.addEventListener('focus', showStats);
      path.addEventListener('click', showStats);
      path.addEventListener('pointerleave', event => {
        if (event.pointerType !== 'mouse' || event.relatedTarget?.closest?.('[data-region]')) return;
        tooltip.hidden = true;
        path.classList.remove('is-active');
      });
      path.addEventListener('blur', event => {
        if (event.relatedTarget?.closest?.('[data-region]')) return;
        tooltip.hidden = true;
        path.classList.remove('is-active');
      });
    });
  } catch {
    map.innerHTML = '<p class="map-loading">La carte des régions est momentanément indisponible.</p>';
  }
}

function addCommentAndAccountSections(data) {
  const nav = document.querySelector('.dashboard-nav');
  nav.insertAdjacentHTML('beforeend', '<button data-dash="approved-projects">Projets validés</button><button data-dash="database">Base de données</button><button data-dash="partners">Partenaires</button><button data-dash="gallery">Galerie</button><button data-dash="security">Sécurité</button><button data-dash="comments">Commentaires</button><button data-dash="accounts">Comptes</button>');
  const content = document.querySelector('#accountContent');
  const adminUser = data.users.find(user => user.role === 'admin');
  content.insertAdjacentHTML('beforeend', `<div class="dashboard-section" id="dash-database"><div class="database-tools"><div><span class="role-badge">BASE LOCALE</span><h3>Base de données des projets et contributeurs</h3><p>Consultez ou exportez les informations enregistrées lors des soumissions et des contributions.</p></div><div class="database-actions"><button class="button button-primary" type="button" data-export-database-excel>Exporter Excel</button><button class="button button-light" type="button" data-export-database-pdf>Exporter PDF</button></div><div class="database-counts"><span><b>${data.submissions.length}</b> projets</span><span><b>${data.contributions.length}</b> contributions</span><span><b>${data.users.filter(user => user.role === 'project-holder').length}</b> comptes porteurs</span></div></div><h3>Projets soumis</h3>${data.submissions.length ? `<div class="database-project-list">${data.submissions.map(item => `<details class="database-project-record"><summary><b>${escapeHtml(item.project || item.beneficiary || 'Projet sans nom')}</b><span class="database-project-meta">${escapeHtml(item.name || 'Porteur non renseigné')} · ${escapeHtml(item.status || 'En attente')} · ${escapeHtml(item.administrativeRegion || item.prefecture || 'Région non renseignée')}</span></summary><div class="review-fields">${renderSubmissionDetails(item)}</div></details>`).join('')}</div>` : '<div class="empty-state">Aucun dossier projet enregistré.</div>'}<h3>Contributeurs</h3>${data.contributions.length ? `<table class="admin-table"><thead><tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Projet</th><th>Montant</th><th>Paiement</th><th>Date</th></tr></thead><tbody>${data.contributions.map(item => `<tr><td>${escapeHtml(item.name || 'Non renseigné')}</td><td>${escapeHtml(item.email || 'Non renseigné')}</td><td>${escapeHtml(item.phone || 'Non renseigné')}</td><td>${escapeHtml(item.project || 'Projet')}</td><td>${formatMoney(item.amount || 0)}</td><td>${escapeHtml(item.payment || '')}</td><td>${escapeHtml(item.createdAt || '')}</td></tr>`).join('')}</tbody></table>` : '<div class="empty-state">Aucune contribution enregistrée.</div>'}</div>`);
  content.insertAdjacentHTML('beforeend', `<div class="dashboard-section" id="dash-security"><h3>Sécurité du compte administrateur</h3><p class="dashboard-note">Code personnel à conserver hors de cet appareil pour récupérer l’accès si vous oubliez votre mot de passe.</p><div class="recovery-code-card"><span>Code de récupération</span><strong>${escapeHtml(adminUser.recoveryCode)}</strong></div><form class="content-form" id="adminPasswordChange"><label>Mot de passe actuel<input name="currentPassword" type="password" required autocomplete="current-password"></label><label>Nouveau mot de passe<input name="password" type="password" required minlength="12" autocomplete="new-password"></label><label>Confirmer le nouveau mot de passe<input name="passwordConfirm" type="password" required minlength="12" autocomplete="new-password"></label><button class="button button-primary" type="submit">Modifier mon mot de passe</button></form></div>`);
  const approvedProjects = data.submissions.filter(item => item.status === 'approved');
  content.insertAdjacentHTML('beforeend', `<div class="dashboard-section" id="dash-approved-projects"><h3>Projets validés</h3><p class="dashboard-note">Les projets de cette liste sont publiés sur l’accueil et comptabilisés sur la carte de Guinée.</p>${approvedProjects.length ? `<table class="admin-table"><thead><tr><th>Projet</th><th>Porteur</th><th>Région</th><th>Objectif</th><th>Action</th></tr></thead><tbody>${approvedProjects.map(item => `<tr><td><b>${escapeHtml(item.project || item.beneficiary || 'Projet sans nom')}</b></td><td>${escapeHtml(item.name || 'Non renseigné')}</td><td>${escapeHtml(item.administrativeRegion || item.prefecture || 'Non renseignée')}</td><td>${formatMoney(item.amount || 0)}</td><td><button class="reject" data-delete-approved-project="${item.id}">Supprimer</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty-state">Aucun projet validé.</div>'}</div>`);
  content.insertAdjacentHTML('beforeend', `<div class="dashboard-section" id="dash-gallery"><h3>Gérer la galerie</h3><p class="dashboard-note">Ajoutez les photos qui seront affichées dans l’onglet Galerie de l’accueil. Formats image acceptés, 1 Mo maximum par photo.</p><form class="content-form" id="galleryForm"><label>Légende de la photo<input name="title" required maxlength="120" placeholder="Ex. Projet agricole à Kindia"></label><label>Photo du projet<input name="image" type="file" accept="image/*" required></label><button class="button button-primary" type="submit">Ajouter à la galerie</button></form><div class="gallery-admin-list">${data.gallery.length ? data.gallery.map(item => `<div class="moderation-item"><div class="gallery-admin-identity"><img src="${escapeHtml(item.image)}" alt=""><b>${escapeHtml(item.title)}</b></div><button class="reject" data-delete-gallery="${item.id}">Retirer</button></div>`).join('') : '<div class="empty-state">La galerie est vide.</div>'}</div></div>`);
  content.insertAdjacentHTML('beforeend', `<div class="dashboard-section" id="dash-comments"><h3>Modérer les commentaires</h3><p class="dashboard-note">Les avis restent archivés ici jusqu'à votre publication.</p><div class="moderation-list">${data.comments.length ? data.comments.map(comment => `<div class="moderation-item"><div><b>${escapeHtml(comment.name)}</b><p>${escapeHtml(comment.body)}</p><small>${comment.status === 'published' ? 'Publié' : 'En attente'}</small></div><div class="table-actions">${comment.status !== 'published' ? `<button class="approve" data-publish-comment="${comment.id}">Garder et publier</button>` : ''}<button class="reject" data-delete-comment="${comment.id}">Supprimer</button></div></div>`).join('') : '<div class="empty-state">Aucun commentaire archivé.</div>'}</div></div><div class="dashboard-section" id="dash-accounts"><h3>Gérer les comptes porteurs</h3><p class="dashboard-note">Les mots de passe sont masqués par défaut. Affichez-les uniquement lorsque vous devez les transmettre au porteur.</p><div class="moderation-list">${data.users.filter(user => user.role !== 'admin').map(user => `<div class="moderation-item"><div><b>${escapeHtml(user.name || user.email)}</b><p>${escapeHtml(user.email)}</p><small>Accès porteur actif · Mot de passe temporaire : <strong>${escapeHtml(user.password || 'Non renseigné')}</strong></small></div><button class="reject" data-delete-account="${escapeHtml(user.email)}">Supprimer le compte</button></div>`).join('') || '<div class="empty-state">Aucun compte porteur à gérer.</div>'}</div></div>`);
  content.insertAdjacentHTML('beforeend', `<div class="dashboard-section" id="dash-partners"><h3>Gérer les partenaires</h3><p class="dashboard-note">Ajoutez un nom, une description et le logo qui apparaîtra sur l’écran d’accueil. Formats image acceptés, 1,5 Mo maximum.</p><form class="content-form partner-form" id="partnerForm"><label>Nom du partenaire<input name="name" required maxlength="100" placeholder="Ex. Fondation Guinée"></label><label>Description courte<input name="description" maxlength="100" placeholder="Ex. Impact social"></label><label>Logo du partenaire<input name="logo" type="file" accept="image/*" required></label><button class="button button-primary" type="submit">Ajouter le partenaire</button></form><div class="partner-admin-list">${data.partners.length ? data.partners.map(partner => `<div class="moderation-item"><div class="partner-admin-identity">${partner.logo ? `<img src="${escapeHtml(partner.logo)}" alt="">` : `<span>${escapeHtml(partner.initials || partner.name.slice(0, 2).toUpperCase())}</span>`}<div><b>${escapeHtml(partner.name)}</b>${partner.description ? `<p>${escapeHtml(partner.description)}</p>` : ''}</div></div><button class="reject" data-delete-partner="${partner.id}">Retirer</button></div>`).join('') : '<div class="empty-state">Aucun partenaire affiché.</div>'}</div></div>`);
}

function maskAccountPasswords() {
  accountPasswordValues.clear();
  document.querySelectorAll('#dash-accounts .moderation-item small strong').forEach((field, index) => {
    const key = String(index);
    accountPasswordValues.set(key, field.textContent);
    field.classList.add('account-password-value');
    field.dataset.passwordVisible = 'false';
    field.textContent = '••••••••••';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'account-password-toggle';
    button.dataset.toggleAccountPassword = key;
    button.textContent = 'Afficher';
    field.parentElement.append(' ', button);
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 3500);
}

const pageLabels = { about: 'Qui sommes-nous', services: 'Nos services', successes: 'Nos réussites' };
function renderPageEditor(data) {
  const page = data.pages.about;
  return `<div class="page-editor"><h3>Configurer les pages publiques</h3><p class="dashboard-note">Choisissez une page, modifiez son contenu, puis publiez-la à tout moment.</p><form class="content-form" id="pageForm"><label>Page<select name="pageKey"><option value="about">Qui sommes-nous</option><option value="services">Nos services</option><option value="successes">Nos réussites</option></select></label><label>Surtitre<input name="eyebrow" required value="${escapeHtml(page.eyebrow)}"></label><label>Titre<input name="title" required value="${escapeHtml(page.title)}"></label><label>Contenu<textarea name="body" required rows="7">${escapeHtml(page.body)}</textarea></label><label>URL de l’image <span class="field-hint">Facultatif</span><input name="image" type="url" value="${escapeHtml(page.image || '')}" placeholder="https://..."></label><button class="button button-primary" type="submit">Enregistrer cette page</button></form></div>`;
}
function updatePageEditor(pageKey) {
  const page = loadData().pages[pageKey];
  const form = document.querySelector('#pageForm');
  if (!page || !form) return;
  form.elements.eyebrow.value = page.eyebrow;
  form.elements.title.value = page.title;
  form.elements.body.value = page.body;
  form.elements.image.value = page.image || '';
}
function openSitePage(pageKey) {
  const page = loadData().pages[pageKey];
  if (!page) return;
  document.querySelector('#sitePageEyebrow').textContent = page.eyebrow;
  document.querySelector('#sitePageTitle').textContent = page.title;
  document.querySelector('#sitePageBody').textContent = page.body;
  const image = document.querySelector('#sitePageImage');
  image.hidden = !page.image;
  image.src = page.image || '';
  image.alt = page.title;
  document.querySelector('#sitePageModal').classList.add('open');
  document.querySelector('#sitePageModal').setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeSitePage() {
  document.querySelector('#sitePageModal').classList.remove('open');
  document.querySelector('#sitePageModal').setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

const businessForm = `<div class="campaign-choice"><p class="form-choice-title">Quel type de projet portez-vous ?</p><label class="choice-card"><input type="radio" name="campaignType" value="business" checked><span><b>Projet d'entreprise</b><small>Créer ou développer une activité économique.</small></span></label><label class="choice-card"><input type="radio" name="campaignType" value="social"><span><b>Campagne de soutien social</b><small>Mobiliser une aide pour une personne ou une cause.</small></span></label></div><div class="form-grid"><label>Nom complet<input name="name" required placeholder="Ex. Mariama Camara"></label><label>Téléphone<input name="phone" required type="tel" placeholder="+224 6XX XX XX XX"></label><label class="full">Email<input name="email" required type="email" placeholder="vous@exemple.com"></label><label>Date de naissance<input name="birthDate" required type="date"></label><fieldset class="gender-field"><legend>Sexe</legend><label><input type="radio" name="gender" value="Homme" required> Homme</label><label><input type="radio" name="gender" value="Femme"> Femme</label></fieldset><label>Nom du projet<input name="project" required placeholder="Ex. Ferme Nimba"></label><label>Domaine d'intervention<select name="category"><option value="agriculture">Agriculture et élevage</option><option value="education">Éducation et formation</option><option value="culture">Culture et patrimoine</option><option value="social">Action sociale et solidarité</option><option value="sante">Santé et bien-être</option><option value="environnement">Environnement et climat</option><option value="technologie">Technologie et innovation</option><option value="commerce">Commerce et artisanat</option><option value="infrastructure">Infrastructures locales</option><option value="sport">Sport et jeunesse</option></select></label><label>Montant souhaité (GNF)<input name="amount" required type="number" min="1" placeholder="25 000 000"></label><label>Préfecture<input name="prefecture" required placeholder="Ex. Kindia"></label><label>Sous-préfecture / commune<input name="subprefecture" required placeholder="Ex. Damakania"></label><label>Quartier<input name="neighborhood" required placeholder="Ex. Tafory"></label><label>Situation actuelle du projet<select name="projectStatus" required><option value="">Sélectionner</option><option value="deja-cree">Projet déjà créé</option><option value="non-cree">Projet non créé</option></select></label><label class="full">Problème résolu par le projet<textarea name="problemSolved" required rows="3" placeholder="Quel problème votre projet permet-il de résoudre ?"></textarea></label><div class="location-field full"><button class="location-button" type="button" id="geolocateProject"><i data-lucide="locate-fixed"></i> La position de mon projet</button><span id="locationStatus">Position non renseignée</span><input type="hidden" name="coordinates" id="coordinates"></div><label class="full">Décrivez votre projet<textarea name="description" required rows="4" placeholder="Quel changement voulez-vous créer ?"></textarea></label></div>`;
const administrativeRegionField = '<label>Région administrative<select name="administrativeRegion" required><option value="">Sélectionner une région</option><option value="GN-B">Boké</option><option value="GN-C">Conakry</option><option value="GN-F">Faranah</option><option value="GN-K">Kankan</option><option value="GN-D">Kindia</option><option value="GN-L">Labé</option><option value="GN-M">Mamou</option><option value="GN-N">Nzérékoré</option></select></label>';
const projectCategories = [{ value: 'agriculture', label: 'Agriculture' }, { value: 'elevage', label: 'Élevage' }, { value: 'peche', label: 'Pêche' }, { value: 'industrie-transformation', label: 'Industrie et transformation' }, { value: 'artisanat', label: 'Artisanat' }, { value: 'commerce', label: 'Commerce' }, { value: 'services', label: 'Services' }, { value: 'technologie', label: 'Technologie' }, { value: 'sport', label: 'Sport' }, { value: 'promotion-culturelle', label: 'Promotion culturelle' }, { value: 'autres', label: 'Autres' }];
let businessFormUpdated = businessForm
  .replace(/<label>Domaine d'intervention<select name="category">[\s\S]*?<\/select><\/label>/, `<label>Domaine d’intervention<select name="category">${projectCategories.map(category => `<option value="${category.value}">${category.label}</option>`).join('')}</select></label><label class="full other-category-field" hidden>Précisez votre domaine<input name="otherCategory" placeholder="Ex. Énergies renouvelables"></label>`)
  .replace(/<label>Préfecture<input name="prefecture" required placeholder="Ex\. Kindia"><\/label><label>Sous-préfecture \/ commune<input name="subprefecture" required placeholder="Ex\. Damakania"><\/label>/, `${administrativeRegionField}<label class="full">Préfecture/Commune<input name="prefecture" required placeholder="Ex. Kindia / Damakania"></label>`);
let socialFormWithRegion;
{
  const socialForm = `<div class="campaign-choice"><p class="form-choice-title">Quel type de projet portez-vous ?</p><label class="choice-card"><input type="radio" name="campaignType" value="business"><span><b>Projet d'entreprise</b><small>Créer ou développer une activité économique.</small></span></label><label class="choice-card"><input type="radio" name="campaignType" value="social" checked><span><b>Campagne de soutien social</b><small>Mobiliser une aide pour une personne ou une cause.</small></span></label></div><div class="form-grid"><label>Prénoms et nom<input name="name" required placeholder="Ex. Aïssatou Bah"></label><label>Date de naissance<input name="birthDate" required type="date"></label><label>Lieu de résidence<input name="residence" required placeholder="Ville, quartier"></label><label>Téléphone<input name="phone" required type="tel" placeholder="+224 6XX XX XX XX"></label><label class="full">Email<input name="email" required type="email" placeholder="vous@exemple.com"></label><label class="full">Bénéficiaire de la campagne de collecte<input name="beneficiary" required placeholder="Nom et prénom du bénéficiaire"></label><label>Contact du bénéficiaire<input name="beneficiaryContact" required type="tel" placeholder="Téléphone du bénéficiaire"></label><label>Résidence du bénéficiaire<input name="beneficiaryResidence" required placeholder="Ville, quartier"></label><label class="full">Motif de la campagne <span class="field-hint">250 mots maximum</span><textarea name="campaignReason" required maxlength="1600" rows="7" placeholder="Décrivez la situation et l'objectif de la collecte."></textarea><small class="word-counter" data-word-counter>0 / 250 mots</small></label><label class="full">Photo du projet ou du bénéficiaire <span class="field-hint">Facultatif</span><input name="photo" type="file" accept="image/*"></label></div>`;
  socialFormWithRegion = socialForm.replace('<label>Lieu de résidence<input name="residence" required placeholder="Ville, quartier"></label>', `<label>Lieu de résidence<input name="residence" required placeholder="Ville, quartier"></label>${administrativeRegionField}`);
  }
businessFormUpdated = businessFormUpdated
  .replace(/<label>Situation actuelle du projet<select name="projectStatus" required>[\s\S]*?<\/select><\/label>/, '<label>Situation actuelle du projet<select name="projectStatus" required><option value="">Sélectionner</option><option value="non-existant">Projet non existant</option><option value="existant-actif">Projet existant et en activité</option><option value="existant-inactif">Projet existant pas en activité</option></select></label>')
  .replace(/<label class="full">Problème résolu par le projet[\s\S]*?<\/label>/, '')
  .replace(/<\/div>`$/, '<label class="full">Photo du projet <span class="field-hint">Facultatif</span><input name="photo" type="file" accept="image/*"></label></div>`');
const financingForm = businessFormUpdated
  .replace(/<label class="full">Photo du projet[\s\S]*?<\/label><\/div>`$/, '</div>`')
  .replace('name="campaignType" value="business" checked', 'name="campaignType" value="business"');
const socialForm = `<div class="campaign-choice"><p class="form-choice-title">Quel type de projet portez-vous ?</p><label class="choice-card"><input type="radio" name="campaignType" value="business"><span><b>Projet d'entreprise</b><small>Créer ou développer une activité économique.</small></span></label><label class="choice-card"><input type="radio" name="campaignType" value="social" checked><span><b>Campagne de soutien social</b><small>Mobiliser une aide pour une personne ou une cause.</small></span></label></div><div class="form-grid"><label>Prénoms et nom<input name="name" required placeholder="Ex. Aïssatou Bah"></label><label>Date de naissance<input name="birthDate" required type="date"></label><label>Lieu de résidence<input name="residence" required placeholder="Ville, quartier"></label><label>Téléphone<input name="phone" required type="tel" placeholder="+224 6XX XX XX XX"></label><label class="full">Email<input name="email" required type="email" placeholder="vous@exemple.com"></label><label class="full">Bénéficiaire de la campagne de collecte<input name="beneficiary" required placeholder="Nom et prénom du bénéficiaire"></label><label>Contact du bénéficiaire<input name="beneficiaryContact" required type="tel" placeholder="Téléphone du bénéficiaire"></label><label>Résidence du bénéficiaire<input name="beneficiaryResidence" required placeholder="Ville, quartier"></label><label class="full">Motif de la campagne <span class="field-hint">250 mots maximum</span><textarea name="campaignReason" required maxlength="1600" rows="7" placeholder="Décrivez la situation et l'objectif de la collecte."></textarea><small class="word-counter" data-word-counter>0 / 250 mots</small></label><label class="full">Photo du projet ou du bénéficiaire <span class="field-hint">Facultatif</span><input name="photo" type="file" accept="image/*"></label></div>`;const formFooter = `<label class="check-label"><input type="checkbox" required> J'accepte que les informations soient examinées par l'équipe KHARGUE.</label><label class="check-label fee-check"><input type="checkbox" name="serviceFee" required><span><strong>Clause relative aux frais de prestation</strong><br>Tout porteur de projet inscrit sur la plateforme reconnaît et accepte qu’une commission équivalente à <strong>10 % du coût total du projet</strong> sera prélevée par la plateforme au titre des frais de prestation. Ce prélèvement est automatique et irrévocable dès lors que la campagne de financement participatif atteint son objectif et que les fonds sont intégralement collectés. L’acceptation de cette condition est obligatoire pour valider l’inscription et la soumission du projet.<br><br>La commission de 10 % couvre l’ensemble des services fournis par la plateforme, notamment la mise en ligne du projet, la gestion technique de la collecte, la sécurisation des transactions et l’accompagnement administratif. Le porteur de projet reconnaît que ces frais constituent une contrepartie légitime et proportionnée aux prestations rendues, et s’engage à ne formuler aucune contestation ou réclamation ultérieure concernant ce prélèvement.<br><br>En cas de réussite de la campagne, le montant net versé au porteur de projet correspondra au total des fonds collectés diminué de la commission de 10 %. Le porteur de projet accepte expressément que cette retenue soit opérée avant tout transfert de fonds, et renonce à toute action visant à remettre en cause la validité, le montant ou la légitimité de ladite commission. Cette clause est ferme, définitive et opposable à toute partie, garantissant ainsi la protection juridique et financière de la plateforme.</span></label><button class="button button-primary submit-button" type="submit">Envoyer mon dossier <i data-lucide="send"></i></button>`;

function bindProjectForm(mode = 'business') {
  const form = document.querySelector('#projectForm');
  form.innerHTML = (mode === 'social' ? socialFormWithRegion : mode === 'financing' ? financingForm : businessFormUpdated) + formFooter;
  if (mode === 'business' && !form.querySelector('[name="photo"]')) {
    form.querySelector('.form-grid').insertAdjacentHTML('beforeend', '<label class="full">Photo du projet <span class="field-hint">Facultatif</span><input name="photo" type="file" accept="image/*"></label>');
  }
  form.onchange = event => {
    if (event.target.name === 'campaignType') {
      bindProjectForm(event.target.value);
      lucide.createIcons();
    }
    if (event.target.name === 'category') {
      const otherField = form.querySelector('.other-category-field');
      otherField.hidden = event.target.value !== 'autres';
      otherField.querySelector('input').required = event.target.value === 'autres';
    }
  };
  const reason = form.querySelector('[name="campaignReason"]');
  if (reason) reason.addEventListener('input', () => {
    const count = reason.value.trim() ? reason.value.trim().split(/\s+/).length : 0;
    form.querySelector('[data-word-counter]').textContent = `${count} / 250 mots`;
    if (count > 250) reason.setCustomValidity('Le motif doit contenir 250 mots maximum.');
    else reason.setCustomValidity('');
  });
  const geolocate = form.querySelector('#geolocateProject');
  if (geolocate) geolocate.addEventListener('click', () => {
    const status = form.querySelector('#locationStatus');
    const coordinates = form.querySelector('#coordinates');
    if (!navigator.geolocation) { status.textContent = 'Géolocalisation indisponible sur cet appareil'; return; }
    status.textContent = 'Recherche de la position...';
    navigator.geolocation.getCurrentPosition(position => { const { latitude, longitude } = position.coords; coordinates.value = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`; status.textContent = `Position enregistrée : ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`; }, () => { status.textContent = 'Position non autorisée. Vous pouvez poursuivre sans coordonnées.'; }, { enableHighAccuracy: true, timeout: 10000 });
  });
}

function openPanel() {
  document.querySelector('#projectForm').hidden = false;
  document.querySelector('.form-intro').hidden = false;
  document.querySelector('#formSuccess').hidden = true;
  bindProjectForm('business');
  document.querySelector('#inscription').classList.add('open');
  document.querySelector('#inscription').setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closePanel() {
  document.querySelector('#inscription').classList.remove('open');
  document.querySelector('#inscription').setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
function openContribution(project) {
  currentContributionProject = project;
  const amountOptions = document.querySelector('.amount-options');
  if (!document.querySelector('#contributorFields')) {
    amountOptions.insertAdjacentHTML('beforebegin', '<div class="contributor-fields" id="contributorFields"><label>Votre nom<input name="contributorName" required maxlength="100" autocomplete="name"></label><label>Votre email <span class="field-hint">Facultatif</span><input name="contributorEmail" type="email" autocomplete="email"></label><label>Votre téléphone<input name="contributorPhone" type="tel" required autocomplete="tel"></label></div>');
  }
  document.querySelectorAll('#contributorFields input').forEach(input => { input.value = ''; });
  document.querySelectorAll('.amount-options [data-amount]').forEach(button => button.classList.toggle('selected', button.dataset.amount === '10000'));
  document.querySelector('#customAmount').value = '';
  document.querySelector('#modalProject').textContent = `Vous soutenez : ${project.title}`;
  document.querySelector('#contributeModal').classList.add('open');
  document.querySelector('#contributeModal').setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeContribution() {
  document.querySelector('#contributeModal').classList.remove('open');
  document.querySelector('#contributeModal').setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
function openProjectDetails(project) {
  document.querySelector('#projectDetailsTitle').textContent = project.title;
  document.querySelector('#projectDetailsCost').textContent = `Coût du projet : ${formatMoney(project.goal)}`;
  document.querySelector('#projectDetailsRaised').textContent = formatMoney(project.raised || 0);
  document.querySelector('#projectDetailsHolder').textContent = project.holder || 'Porteur du projet';
  document.querySelector('#projectDetailsPrefecture').textContent = project.prefecture || project.location || 'Non renseignée';
  document.querySelector('#projectDetailsNeighborhood').textContent = project.neighborhood || 'Non renseigné';
  document.querySelector('#projectDetailsDescription').textContent = project.description || 'Description non renseignée.';
  document.querySelector('#projectDetailsModal').classList.add('open');
  document.querySelector('#projectDetailsModal').setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeProjectDetails() {
  document.querySelector('#projectDetailsModal').classList.remove('open');
  document.querySelector('#projectDetailsModal').setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function openAccount() {
  renderAccount('login');
  document.querySelector('#accountPanel').classList.add('open');
  document.querySelector('#accountPanel').setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeAccount() {
  document.querySelector('#accountPanel').classList.remove('open');
  document.querySelector('#accountPanel').setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
function renderAccount(view = 'login') {
  const content = document.querySelector('#accountContent');
  if (accountRole) { renderDashboard(accountRole); return; }
  if (view === 'forgot-admin-password') {
    content.innerHTML = `<p class="account-kicker">Récupération administrateur</p><h2 id="accountTitle">Réinitialiser le mot de passe</h2><p>Saisissez votre email admin, votre code de récupération et un nouveau mot de passe.</p><form class="account-form" id="adminPasswordRecovery"><label>Email administrateur<input name="email" type="email" required placeholder="admin@khargue.gn"></label><label>Code de récupération<input name="recoveryCode" required autocomplete="one-time-code"></label><label>Nouveau mot de passe<input name="password" type="password" required minlength="12" autocomplete="new-password"></label><label>Confirmer le mot de passe<input name="passwordConfirm" type="password" required minlength="12" autocomplete="new-password"></label><button class="button button-primary" type="submit">Réinitialiser le mot de passe</button><button class="text-link account-back" type="button" data-back-to-login>Retour à la connexion</button></form>`;
    lucide.createIcons();
    return;
  }
  if (view === 'recovery-code-ready') {
    content.innerHTML = `<p class="account-kicker">Mot de passe mis à jour</p><h2 id="accountTitle">Code de récupération</h2><p>Ce code remplace l’ancien. Conservez-le en lieu sûr; vous pourrez le retrouver dans Sécurité après connexion.</p><div class="recovery-code-display">${escapeHtml(recoveryCodeNotice)}</div><button class="button button-primary" type="button" data-back-to-login>Continuer vers la connexion</button>`;
    lucide.createIcons();
    return;
  }
  const rememberedLogin = JSON.parse(localStorage.getItem(rememberLoginKey) || 'null');
  loginRole = rememberedLogin?.role || 'admin';
  content.innerHTML = `<p class="account-kicker">Espace sécurisé KHARGUE</p><h2 id="accountTitle">Votre espace<br><em>de confiance.</em></h2><p>Choisissez votre espace puis connectez-vous.</p><div class="login-role-choice"><button type="button" class="${loginRole === 'admin' ? 'active' : ''}" data-login-role="admin"><i data-lucide="shield-check"></i> Administrateur</button><button type="button" class="${loginRole === 'holder' ? 'active' : ''}" data-login-role="holder"><i data-lucide="briefcase-business"></i> Compte porteur</button></div><form class="account-form" id="accountLogin"><input type="hidden" name="loginRole" value="${loginRole}"><label>Email<input name="email" type="email" required value="${escapeHtml(rememberedLogin?.email || '')}" placeholder="vous@exemple.com"></label><label>Mot de passe<input name="password" type="password" required value="${escapeHtml(rememberedLogin?.password || '')}" placeholder="Votre mot de passe"></label><label class="remember-login"><input name="rememberLogin" type="checkbox" ${rememberedLogin ? 'checked' : ''}> Se souvenir de moi</label><button class="button button-primary" type="submit">Accéder à mon espace <i data-lucide="arrow-right"></i></button><button class="text-link account-back" type="button" data-forgot-admin-password>Mot de passe oublié ?</button></form>`;
  lucide.createIcons();
}
function renderDashboard(role) {
  const data = loadData();
  const content = document.querySelector('#accountContent');
  if (role === 'admin') {
    const adminUser = data.users.find(user => user.role === 'admin');
    if (adminUser && !adminUser.recoveryCode) {
      adminUser.recoveryCode = generateRecoveryCode();
      saveData(data);
    }
    const pending = data.submissions.filter(item => item.status === 'pending');
    content.innerHTML = `<div class="dashboard-top"><div><span class="role-badge">ADMINISTRATEUR</span><h2 id="accountTitle">Piloter KHARGUE</h2><p>Validation, contributeurs et contenu du site.</p></div><button data-logout>Se déconnecter</button></div><div class="dashboard-nav"><button class="active" data-dash="overview">Projets</button><button data-dash="contributors">Contributeurs</button><button data-dash="content">Contenu du site</button></div><div class="dashboard-section active" id="dash-overview"><div class="dashboard-metrics"><div class="dashboard-metric"><strong>${data.submissions.length}</strong><span>Dossiers reçus</span></div><div class="dashboard-metric"><strong>${pending.length}</strong><span>À valider</span></div><div class="dashboard-metric"><strong>${formatMoney(data.contributions.reduce((sum, item) => sum + item.amount, 0))}</strong><span>Contributions</span></div></div><h3>Dossiers à traiter</h3>${pending.length ? `<table class="admin-table"><thead><tr><th>Projet</th><th>Porteur</th><th>Montant</th><th>Action</th></tr></thead><tbody>${pending.map(item => `<tr><td><b>${escapeHtml(item.project)}</b><br><small>${escapeHtml(item.category)} · ${escapeHtml(item.prefecture)}</small><details class="review-details"><summary>Consulter le dossier complet</summary><div class="review-fields">${renderSubmissionDetails(item)}</div></details></td><td>${escapeHtml(item.name)}<br>${escapeHtml(item.email)}</td><td>${formatMoney(item.amount)}</td><td class="table-actions"><button class="approve" data-approve="${item.id}">Valider</button><button class="reject" data-reject="${item.id}">Rejeter</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty-state">Aucun dossier en attente.</div>'}</div><div class="dashboard-section" id="dash-contributors"><h3>Contributeurs</h3><div class="info-list">${data.contributions.length ? data.contributions.map(item => `<div class="info-row"><b>${item.name || 'Visiteur'}</b><span>${formatMoney(item.amount)} · ${item.payment}</span></div>`).join('') : '<div class="empty-state">Les contributions apparaîtront ici après paiement.</div>'}</div></div><div class="dashboard-section" id="dash-content"><h3>Gérer les informations publiques</h3><form class="content-form" id="contentForm"><label>Titre de l'annonce<input name="title" required placeholder="Ex. Nouveau partenaire"></label><label>Message<textarea name="body" required placeholder="Texte à afficher sur le site"></textarea></label><button class="button button-primary" type="submit">Publier l'information</button></form>${data.content.map(item => `<div class="info-row"><b>${item.title}</b><span>${item.body}</span></div>`).join('')}</div>`;
    const databaseSection = document.querySelector('#dash-content');
    databaseSection.insertAdjacentHTML('afterbegin', `<div class="database-tools"><div><span class="role-badge">BASE LOCALE</span><h3>Gérer la base de données</h3><p>Exportez une sauvegarde JSON ou restaurez une base existante.</p></div><div class="database-actions"><button class="button button-primary" data-export-db><i data-lucide="download"></i>Exporter la base</button><label class="button button-light database-upload"><i data-lucide="upload"></i>Importer une base<input class="database-file" type="file" accept="application/json,.json"></label><button class="database-reset" data-clear-db>Effacer les données</button></div><div class="database-counts"><span><b>${data.submissions.length}</b> projets</span><span><b>${data.contributions.length}</b> contributions</span><span><b>${data.users.length}</b> comptes</span><span><b>${data.content.length}</b> contenus</span></div></div>`);
    databaseSection.insertAdjacentHTML('afterbegin', renderPageEditor(data));
    addCommentAndAccountSections(data);
  } else {
    const user = data.users.find(item => item.role === 'project-holder' && item.email === accountRole.email);
    const own = user ? data.submissions.find(item => item.email === user.email) : null;
    content.innerHTML = `<div class="dashboard-top"><div><span class="role-badge">PORTEUR DE PROJET</span><h2 id="accountTitle">Bonjour ${user.name}</h2><p>Le suivi de votre campagne, au même endroit.</p></div><button data-logout>Se déconnecter</button></div><div class="dashboard-metrics"><div class="dashboard-metric"><strong>${own ? formatMoney(own.raised || 0) : '0 GNF'}</strong><span>Collectés</span></div><div class="dashboard-metric"><strong>${own ? formatMoney(own.amount) : '0 GNF'}</strong><span>Objectif</span></div><div class="dashboard-metric"><strong>${own ? Math.round(((own.raised || 0) / own.amount) * 100) : 0}%</strong><span>Avancement</span></div></div><h3>Vos contributeurs</h3>${data.contributions.length ? `<div class="info-list">${data.contributions.map(item => `<div class="info-row"><b>${item.name || 'Contributeur'}</b><span>${item.email || 'Contact non renseigné'} · ${formatMoney(item.amount)}</span></div>`).join('')}</div>` : '<div class="empty-state">Les noms et contacts apparaîtront ici.</div>'}`;
  }
  if (role === 'admin') maskAccountPasswords();
  lucide.createIcons();
}

renderProjects();
renderPartners();
renderGallery();
renderRegionalMap();
lucide.createIcons();
projectSearch.addEventListener('input', renderProjects);
projectCategorySelect.addEventListener('change', renderProjects);
projectLetterSelect.addEventListener('change', renderProjects);

function activateDashboardTab(tabName) {
  const button = document.querySelector(`.dashboard-nav [data-dash="${tabName}"]`);
  const section = document.querySelector(`#dash-${tabName}`);
  if (!button || !section) return;
  document.querySelectorAll('.dashboard-nav button').forEach(item => item.classList.toggle('active', item === button));
  document.querySelectorAll('.dashboard-section').forEach(item => item.classList.toggle('active', item === section));
}

document.addEventListener('click', event => {
  if (event.target.closest('[data-account]')) openAccount();
  if (event.target.closest('[data-close-account]')) closeAccount();
  const loginRoleButton = event.target.closest('[data-login-role]');
  if (loginRoleButton) {
    loginRole = loginRoleButton.dataset.loginRole;
    document.querySelectorAll('[data-login-role]').forEach(button => button.classList.toggle('active', button === loginRoleButton));
    document.querySelector('#accountLogin input[name="loginRole"]').value = loginRole;
  }
  if (event.target.closest('[data-forgot-admin-password]')) {
    if (loginRole !== 'admin') { showToast('La récupération par code est réservée au compte administrateur.'); return; }
    renderAccount('forgot-admin-password');
  }
  const passwordToggle = event.target.closest('[data-toggle-account-password]');
  if (passwordToggle) {
    const key = passwordToggle.dataset.toggleAccountPassword;
    const field = passwordToggle.parentElement.querySelector('strong');
    const reveal = field.dataset.passwordVisible !== 'true';
    field.textContent = reveal ? accountPasswordValues.get(key) : '••••••••••';
    field.dataset.passwordVisible = String(reveal);
    passwordToggle.textContent = reveal ? 'Masquer' : 'Afficher';
  }
  if (event.target.closest('[data-back-to-login]')) {
    recoveryCodeNotice = '';
    renderAccount('login');
  }
  const dashboardTab = event.target.closest('[data-dash]');
  if (dashboardTab) activateDashboardTab(dashboardTab.dataset.dash);
  const deleteApprovedProjectButton = event.target.closest('[data-delete-approved-project]');
  if (deleteApprovedProjectButton && window.confirm('Supprimer ce projet validé de l’accueil et de la carte ?')) {
    const projectId = deleteApprovedProjectButton.dataset.deleteApprovedProject;
    const data = loadData();
    data.submissions = data.submissions.filter(item => String(item.id) !== projectId);
    saveData(data);
    const raisedTotals = JSON.parse(localStorage.getItem(projectRaisedKey) || '{}');
    delete raisedTotals[projectId];
    localStorage.setItem(projectRaisedKey, JSON.stringify(raisedTotals));
    renderDashboard('admin');
    activateDashboardTab('approved-projects');
    renderProjects();
    renderRegionalMap();
    showToast('Projet supprimé de l’accueil et de la carte.');
  }
  const deletePartnerButton = event.target.closest('[data-delete-partner]');
  if (deletePartnerButton) {
    const data = loadData();
    data.partners = data.partners.filter(partner => String(partner.id) !== deletePartnerButton.dataset.deletePartner);
    saveData(data);
    renderDashboard('admin');
    activateDashboardTab('partners');
    renderPartners();
    showToast('Partenaire retiré de l’accueil.');
  }
  const deleteGalleryButton = event.target.closest('[data-delete-gallery]');
  if (deleteGalleryButton) {
    const data = loadData();
    data.gallery = data.gallery.filter(item => String(item.id) !== deleteGalleryButton.dataset.deleteGallery);
    data.galleryInitialized = true;
    saveData(data);
    renderDashboard('admin');
    activateDashboardTab('gallery');
    renderGallery();
    showToast('Photo retirée de la galerie.');
  }
  const approve = event.target.closest('[data-approve]');
  if (approve) updateSubmission(Number(approve.dataset.approve), 'approved');
  const reject = event.target.closest('[data-reject]');
  if (reject) updateSubmission(Number(reject.dataset.reject), 'rejected');
  if (event.target.closest('[data-logout]')) { accountRole = null; renderAccount('login'); }
  if (event.target.closest('[data-export-db]')) exportDatabase();
  if (event.target.closest('[data-export-database-excel]')) exportDatabaseExcel();
  if (event.target.closest('[data-export-database-pdf]')) exportDatabasePdf();
  if (event.target.closest('[data-clear-db]')) clearDatabase();
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) { event.preventDefault(); openPanel(); }
  if (event.target.closest('[data-close-panel]')) closePanel();
  if (event.target.closest('[data-close-modal]')) closeContribution();
  if (event.target.closest('[data-close-details]')) closeProjectDetails();
  const pageLink = event.target.closest('[data-page]');
  if (pageLink) { event.preventDefault(); openSitePage(pageLink.dataset.page); }
  if (event.target.closest('[data-close-page]')) closeSitePage();

  const detailButton = event.target.closest('[data-details]');
  if (detailButton) {
    const project = getAvailableProjects().find(item => item.id === Number(detailButton.dataset.details));
    if (project) openProjectDetails(project);
  }
  const contributeButton = event.target.closest('[data-contribute]');
  if (contributeButton) openContribution(getAvailableProjects().find(item => item.id === Number(contributeButton.dataset.contribute)));

  const amountButton = event.target.closest('[data-amount]');
  if (amountButton) {
    document.querySelectorAll('.amount-options button').forEach(button => button.classList.remove('selected'));
    amountButton.classList.add('selected');
    document.querySelector('#customAmount').value = '';
  }

  const paymentButton = event.target.closest('[data-payment]');
  if (paymentButton) {
    document.querySelectorAll('.payment-grid button').forEach(button => button.classList.remove('selected'));
    paymentButton.classList.add('selected');
  }
});

function exportDatabase() {
  const blob = new Blob([JSON.stringify(loadData(), null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `khargue-base-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Base de données exportée.');
}

function downloadBlob(blob, fileName) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getDatabaseExportData() {
  const data = loadData();
  const internalFields = new Set(['id', 'raised', 'accountPassword', 'accountCreatedAt']);
  const projects = data.submissions.map(submission => Object.fromEntries(Object.entries(submission).filter(([key]) => !internalFields.has(key)).map(([key, value]) => [fieldLabels[key] || key, key === 'photo' && String(value).startsWith('data:image/') ? 'Image jointe' : key === 'amount' ? Number(value) : value])));
  const contributors = data.contributions.map(contribution => ({
    Nom: contribution.name || '',
    Email: contribution.email || '',
    Téléphone: contribution.phone || '',
    Projet: contribution.project || '',
    'Identifiant projet': contribution.projectId || '',
    Montant: Number(contribution.amount || 0),
    Paiement: contribution.payment || '',
    Statut: contribution.status || '',
    Date: contribution.createdAt || ''
  }));
  return { projects, contributors };
}

function exportDatabaseExcel() {
  if (!window.XLSX) { showToast('L’export Excel est indisponible. Vérifiez la connexion puis rechargez la page.'); return; }
  const { projects, contributors } = getDatabaseExportData();
  const workbook = window.XLSX.utils.book_new();
  const projectSheet = window.XLSX.utils.json_to_sheet(projects.length ? projects : [{ Projet: 'Aucun projet enregistré' }]);
  const contributorSheet = window.XLSX.utils.json_to_sheet(contributors.length ? contributors : [{ Nom: 'Aucun contributeur enregistré' }]);
  window.XLSX.utils.book_append_sheet(workbook, projectSheet, 'Projets');
  window.XLSX.utils.book_append_sheet(workbook, contributorSheet, 'Contributeurs');
  const file = window.XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  downloadBlob(new Blob([file], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `khargue-base-${new Date().toISOString().slice(0, 10)}.xlsx`);
  showToast('Base exportée au format Excel.');
}

function exportDatabasePdf() {
  if (!window.jspdf?.jsPDF) { showToast('L’export PDF est indisponible. Vérifiez la connexion puis rechargez la page.'); return; }
  const { projects, contributors } = getDatabaseExportData();
  const document = new window.jspdf.jsPDF({ orientation: 'landscape' });
  if (typeof document.autoTable !== 'function') { showToast('La génération PDF est indisponible. Rechargez la page puis réessayez.'); return; }
  document.setFontSize(16);
  document.text('Base de données KHARGUE', 14, 16);
  document.setFontSize(12);
  document.text(`Projets (${projects.length})`, 14, 26);
  const projectRows = projects.flatMap(project => Object.entries(project).map(([label, value]) => [label, String(value ?? '')]));
  document.autoTable({ startY: 30, head: [['Champ', 'Information']], body: projectRows.length ? projectRows : [['Projet', 'Aucun projet enregistré']], theme: 'grid', styles: { fontSize: 8, cellPadding: 2 }, columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 'auto' } } });
  document.addPage();
  document.setFontSize(12);
  document.text(`Contributeurs (${contributors.length})`, 14, 16);
  const contributorHeaders = ['Nom', 'Email', 'Téléphone', 'Projet', 'Montant', 'Paiement', 'Statut', 'Date'];
  const contributorRows = contributors.map(contributor => contributorHeaders.map(header => String(contributor[header] ?? '')));
  document.autoTable({ startY: 21, head: [contributorHeaders], body: contributorRows.length ? contributorRows : [['Aucun contributeur enregistré', '', '', '', '', '', '', '']], theme: 'grid', styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' }, horizontalPageBreak: true });
  downloadBlob(document.output('blob'), `khargue-base-${new Date().toISOString().slice(0, 10)}.pdf`);
  showToast('Base exportée au format PDF.');
}

function clearDatabase() {
  if (!window.confirm('Effacer les projets, contributions et contenus enregistrés ?')) return;
  const cleanData = JSON.parse(JSON.stringify(defaultData));
  saveData(cleanData);
  renderDashboard('admin');
  showToast('Base de données réinitialisée.');
}

document.addEventListener('change', event => {
  if (!event.target.matches('.database-file')) return;
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported.submissions) || !Array.isArray(imported.contributions) || !Array.isArray(imported.users) || !Array.isArray(imported.content)) throw new Error('Format invalide');
      imported.users = imported.users.filter(user => user.role !== 'visitor');
      saveData(imported);
      renderDashboard('admin');
      showToast('Base de données importée avec succès.');
    } catch (error) {
      showToast('Fichier de base invalide.');
    }
  };
  reader.readAsText(file);
});

document.querySelector('#projectForm').addEventListener('submit', async event => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.target));
  const photo = event.target.elements.photo?.files[0];
  delete values.photo;
  if (photo) values.photo = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(photo);
  });
  const data = loadData();
  const isSocial = values.campaignType === 'social';
  data.submissions.push({ ...values, project: values.project || `Campagne pour ${values.beneficiary}`, category: isSocial ? 'social' : values.category === 'autres' ? values.otherCategory : values.category, prefecture: values.prefecture || values.residence, description: values.description || values.campaignReason, amount: Number(values.amount || 0), id: Date.now(), raised: 0, status: 'pending', photo: values.photo || '' });
  saveData(data);
  renderRegionalMap();
  renderProjects();
  event.target.hidden = true;
  document.querySelector('.form-intro').hidden = true;
  document.querySelector('#formSuccess').hidden = false;
  lucide.createIcons();
});

function updateSubmission(id, status) {
  const data = loadData();
  const submission = data.submissions.find(item => item.id === id);
  if (!submission) return;
  submission.status = status;
  if (status === 'approved') {
    const password = `KH${String(id).slice(-6)}`;
    const existingUser = data.users.find(user => user.email === submission.email);
    if (existingUser) {
      existingUser.name = submission.name;
      existingUser.password = existingUser.password || password;
      existingUser.role = 'project-holder';
      submission.accountPassword = existingUser.password;
    } else {
      data.users.push({ name: submission.name, email: submission.email, password, role: 'project-holder' });
      submission.accountPassword = password;
    }
    submission.accountCreatedAt = new Date().toISOString();
  }
  saveData(data);
  renderDashboard('admin');
  renderRegionalMap();
  renderProjects();
  showToast(status === 'approved' ? `Projet validé. Accès créé pour ${submission.email}. Consultez l'onglet Comptes.` : 'Projet rejeté.');
}

document.addEventListener('submit', async event => {
  if (event.target.id === 'adminPasswordChange') {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.target));
    const data = loadData();
    const adminUser = data.users.find(user => user.role === 'admin');
    if (!adminUser || adminUser.password !== values.currentPassword) { showToast('Le mot de passe actuel est incorrect.'); return; }
    if (values.password.length < 12) { showToast('Le nouveau mot de passe doit contenir au moins 12 caractères.'); return; }
    if (values.password !== values.passwordConfirm) { showToast('Les mots de passe ne correspondent pas.'); return; }
    adminUser.password = values.password;
    adminUser.recoveryCode = generateRecoveryCode();
    localStorage.removeItem(rememberLoginKey);
    recoveryCodeNotice = adminUser.recoveryCode;
    saveData(data);
    renderDashboard('admin');
    activateDashboardTab('security');
    showToast('Mot de passe modifié. Enregistrez le nouveau code de récupération.');
  }
  if (event.target.id === 'adminPasswordRecovery') {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.target));
    const data = loadData();
    const adminUser = data.users.find(user => user.role === 'admin' && user.email.toLowerCase() === values.email.trim().toLowerCase());
    if (!adminUser || !adminUser.recoveryCode || adminUser.recoveryCode !== values.recoveryCode.trim().replace(/\s+/g, '').toUpperCase()) { showToast('Email ou code de récupération incorrect.'); return; }
    if (values.password.length < 12) { showToast('Le nouveau mot de passe doit contenir au moins 12 caractères.'); return; }
    if (values.password !== values.passwordConfirm) { showToast('Les mots de passe ne correspondent pas.'); return; }
    adminUser.password = values.password;
    adminUser.recoveryCode = generateRecoveryCode();
    recoveryCodeNotice = adminUser.recoveryCode;
    localStorage.removeItem(rememberLoginKey);
    saveData(data);
    renderAccount('recovery-code-ready');
  }
  if (event.target.id === 'galleryForm') {
    event.preventDefault();
    const form = event.target;
    const imageFile = form.elements.image.files[0];
    if (!imageFile || !imageFile.type.startsWith('image/')) { showToast('Sélectionnez un fichier image valide.'); return; }
    if (imageFile.size > 1024 * 1024) { showToast('La photo doit peser 1 Mo maximum.'); return; }
    try {
      const image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
      const values = Object.fromEntries(new FormData(form));
      const data = loadData();
      data.gallery.push({ id: Date.now(), title: values.title.trim(), image });
      data.galleryInitialized = true;
      saveData(data);
      renderDashboard('admin');
      activateDashboardTab('gallery');
      renderGallery();
      showToast('Photo ajoutée à la galerie de l’accueil.');
    } catch {
      showToast('Impossible d’enregistrer la photo. Vérifiez l’espace disponible dans le navigateur.');
    }
  }
  if (event.target.id === 'partnerForm') {
    event.preventDefault();
    const form = event.target;
    const logoFile = form.elements.logo.files[0];
    if (!logoFile || !logoFile.type.startsWith('image/')) { showToast('Sélectionnez un fichier image valide.'); return; }
    if (logoFile.size > 1024 * 1024) { showToast('Le logo doit peser 1 Mo maximum.'); return; }
    try {
      const logo = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(logoFile);
      });
      const values = Object.fromEntries(new FormData(form));
      const data = loadData();
      data.partners.push({ id: Date.now(), name: values.name.trim(), description: values.description.trim(), logo, initials: values.name.trim().slice(0, 2).toUpperCase() });
      saveData(data);
      renderDashboard('admin');
      activateDashboardTab('partners');
      renderPartners();
      showToast('Partenaire ajouté à l’accueil.');
    } catch {
      showToast('Impossible d’enregistrer le logo. Vérifiez l’espace disponible dans le navigateur.');
    }
  }
  if (event.target.id === 'accountLogin') {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.target));
    const expectedRole = values.loginRole === 'holder' ? 'project-holder' : 'admin';
    const user = loadData().users.find(item => item.role === expectedRole && item.email === values.email && item.password === values.password);
    if (!user) { showToast('Email ou mot de passe incorrect.'); return; }
    accountRole = user.role === 'admin' ? 'admin' : { email: user.email };
    if (values.rememberLogin) localStorage.setItem(rememberLoginKey, JSON.stringify({ email: values.email, password: values.password, role: values.loginRole }));
    else localStorage.removeItem(rememberLoginKey);
    renderDashboard(accountRole);
  }
  if (event.target.id === 'contentForm') { event.preventDefault(); const data = loadData(); data.content.unshift(Object.fromEntries(new FormData(event.target))); saveData(data); renderDashboard('admin'); showToast('Information publiée dans la base locale.'); }
  if (event.target.id === 'pageForm') { event.preventDefault(); const values = Object.fromEntries(new FormData(event.target)); const data = loadData(); data.pages[values.pageKey] = { eyebrow: values.eyebrow, title: values.title, body: values.body, image: values.image }; saveData(data); renderDashboard('admin'); showToast(`${pageLabels[values.pageKey]} mise à jour.`); }
});

document.addEventListener('change', event => {
  if (event.target.matches('#pageForm select[name="pageKey"]')) updatePageEditor(event.target.value);
});

document.querySelector('#geolocateProject').addEventListener('click', () => {
  const status = document.querySelector('#locationStatus');
  const coordinates = document.querySelector('#coordinates');
  if (!navigator.geolocation) {
    status.textContent = 'Géolocalisation indisponible sur cet appareil';
    return;
  }
  status.textContent = 'Recherche de la position...';
  navigator.geolocation.getCurrentPosition(position => {
    const { latitude, longitude } = position.coords;
    coordinates.value = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    status.textContent = `Position enregistrée : ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }, () => {
    status.textContent = 'Position non autorisée. Vous pouvez poursuivre sans coordonnées.';
  }, { enableHighAccuracy: true, timeout: 10000 });
});

document.querySelector('#paymentSubmit').addEventListener('click', async () => {
  const payment = document.querySelector('.payment-grid button.selected');
  const selectedAmount = document.querySelector('.amount-options button.selected');
  const customAmount = document.querySelector('#customAmount').value;
  if (!payment) {
    showToast('Sélectionnez un moyen de paiement pour continuer.');
    return;
  }
  const contributor = {
    name: document.querySelector('[name="contributorName"]')?.value.trim() || '',
    email: document.querySelector('[name="contributorEmail"]')?.value.trim() || '',
    phone: document.querySelector('[name="contributorPhone"]')?.value.trim() || ''
  };
  if (!contributor.name || !contributor.phone) {
    showToast('Renseignez votre nom et votre téléphone avant de continuer.');
    return;
  }
  const numericAmount = customAmount ? Number(customAmount) : Number(selectedAmount?.dataset.amount);
  if (!Number.isInteger(numericAmount) || numericAmount < 10000) {
    showToast('La contribution minimale est de 10 000 GNF.');
    return;
  }
  const amount = formatMoney(numericAmount);
  const submit = document.querySelector('#paymentSubmit');
  submit.disabled = true;
  submit.classList.add('is-loading');
  submit.setAttribute('aria-busy', 'true');
  submit.querySelector('span').textContent = 'Connexion au paiement...';
  try {
    const response = await fetch('/api/payments/create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: currentContributionProject.id, amount: numericAmount, currency: 'GNF', paymentMethod: payment.dataset.payment, description: `Contribution au projet ${currentContributionProject.title}` }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Création du paiement impossible');
    const data = loadData();
    data.contributions.unshift({ id: result.id || Date.now(), projectId: currentContributionProject.id, project: currentContributionProject.title, ...contributor, amount: numericAmount, payment: payment.dataset.payment, status: result.status || 'created', createdAt: new Date().toISOString() });
    saveData(data);
    const raisedTotals = JSON.parse(localStorage.getItem(projectRaisedKey) || '{}');
    raisedTotals[currentContributionProject.id] = (raisedTotals[currentContributionProject.id] || currentContributionProject.raised || 0) + numericAmount;
    localStorage.setItem(projectRaisedKey, JSON.stringify(raisedTotals));
    renderProjects();
    renderRegionalMap();
    closeContribution();
    showToast(result.checkoutUrl ? `Paiement ${amount} créé. Ouverture de ${payment.dataset.payment}.` : 'Paiement créé.');
    if (result.checkoutUrl && result.provider !== 'mock') window.location.href = result.checkoutUrl;
  } catch (error) {
    showToast(`Paiement indisponible : ${error.message}. Lancez le serveur KHARGUE.`);
  } finally {
    submit.disabled = false;
    submit.classList.remove('is-loading');
    submit.setAttribute('aria-busy', 'false');
    submit.querySelector('span').textContent = 'Valider ma contribution';
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { closePanel(); closeContribution(); closeAccount(); }
});
