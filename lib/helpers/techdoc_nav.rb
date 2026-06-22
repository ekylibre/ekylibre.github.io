# Sidebar de navigation pour la Tech Doc.
#
# Iterate sur les items @items.find_all('/techdoc/**/*.md'), construit un arbre
# implicite a partir des chemins (path = profondeur), et trie par sort_rank
# (frontmatter) puis par titre.
#
# Conventions :
#   * sort_rank (entier) — plus petit = plus haut
#   * en l'absence de sort_rank → 9999
#   * tiebreaker = nav_title || title
#
# N'utilise pas item.children (incompatible avec les identifiants non-legacy de
# Nanoc 4.x).
def techdoc_sidebar
  items = techdoc_items
  return '' if items.empty?

  buffer = +'<nav class="techdoc-sidebar" aria-label="Documentation technique">'
  buffer << '<ul class="nav techdoc-nav">'
  items.each do |entry|
    buffer << techdoc_render_entry(entry)
  end
  buffer << '</ul></nav>'
  buffer
end

# Construit la liste d'items techdoc trie + marque la hierarchie.
# Retourne un tableau de hash { item, depth, children: [...] }.
def techdoc_items
  all = @items.find_all('/techdoc/**/*.md').reject { |i| i[:is_hidden] || i.path.nil? }
  return [] if all.empty?

  # Regrouper par profondeur de chemin (segments apres /techdoc/).
  # Le root est /techdoc/index.md → depth 0.
  # Les enfants directs (/techdoc/foo.md, /techdoc/foo/index.md) → depth 1.
  # Les petits-enfants (/techdoc/foo/bar.md) → depth 2.
  root = all.find { |i| i.identifier.to_s == '/techdoc/index.md' }
  rest = all.reject { |i| i == root }

  # Map identifier-string → entry hash
  entries = {}
  rest.each do |i|
    entries[i.identifier.to_s] = { item: i, children: [] }
  end

  # Top-level entries (depth = 1 dans /techdoc/)
  top = []
  rest.each do |i|
    parent_id = techdoc_parent_id(i)
    if parent_id && entries.key?(parent_id)
      entries[parent_id][:children] << entries[i.identifier.to_s]
    else
      top << entries[i.identifier.to_s]
    end
  end

  # Tri recursif
  sort_proc = ->(arr) {
    arr.sort_by! { |e| [e[:item][:sort_rank] || 9999, (e[:item][:nav_title] || e[:item][:title] || '').downcase] }
    arr.each { |e| sort_proc.call(e[:children]) }
  }
  sort_proc.call(top)

  # Insere le root en debut
  root_entry = root ? [{ item: root, children: [], root: true }] : []
  root_entry + top
end

# Donne l'identifier "parent" d'un item sous /techdoc/.
# Exemple :
#   /techdoc/install/native-ubuntu.md → /techdoc/install/index.md (si existe)
#   /techdoc/install/index.md         → /techdoc/index.md (root)
#   /techdoc/architecture.md          → /techdoc/index.md (root, mais on retourne nil → top-level)
def techdoc_parent_id(item)
  path = item.identifier.to_s # ex: /techdoc/install/native-ubuntu.md
  parts = path.sub(%r{\A/techdoc/}, '').sub(/\.md\z/, '').split('/')
  return nil if parts.length <= 1 # top-level, parent = root → on retourne nil

  if parts.last == 'index'
    # /techdoc/install/index.md → parent serait /techdoc/index.md → nil
    return nil if parts.length == 2
    # /techdoc/foo/bar/index.md → parent /techdoc/foo/bar.md ou /techdoc/foo/index.md
    "/techdoc/#{parts[0..-3].join('/')}/index.md"
  else
    # /techdoc/install/native-ubuntu.md → /techdoc/install/index.md
    parent_dir = parts[0..-2].join('/')
    "/techdoc/#{parent_dir}/index.md"
  end
end

def techdoc_render_entry(entry)
  item = entry[:item]
  children = entry[:children]
  is_root = entry[:root]

  active = techdoc_active?(item, children)
  current = @item_rep.respond_to?(:path) && @item_rep.path == item.path

  classes = []
  classes << 'active' if active
  classes << 'current' if current
  classes << 'has-children' if children.any?

  buffer = +(classes.any? ? %(<li class="#{classes.join(' ')}">) : '<li>')

  title = item[:nav_title] || item[:title] || item.identifier.to_s
  icon = item[:nav_icon]
  icon_html = icon ? %(<i class="fa fa-#{icon}" aria-hidden="true"></i> ) : ''
  aria_current = current ? ' aria-current="page"' : ''

  if is_root
    buffer << %(<a class="techdoc-root" href="#{item.path}"#{aria_current}>#{icon_html}<strong>#{title}</strong></a>)
  else
    buffer << %(<a href="#{item.path}"#{aria_current}>#{icon_html}#{title}</a>)
  end

  if children.any?
    buffer << '<ul class="nav">'
    children.each { |c| buffer << techdoc_render_entry(c) }
    buffer << '</ul>'
  end

  buffer << '</li>'
  buffer
end

def techdoc_active?(item, children)
  return false unless @item_rep.respond_to?(:path) && @item_rep.path
  return true if @item_rep.path == item.path
  children.any? { |c| techdoc_active?(c[:item], c[:children]) }
end
