const searchResults = document.querySelector("[data-search-results]");

if (searchResults) {
  const status = document.querySelector("[data-search-status]");
  const queryInput = document.querySelector('.site-search input[name="q"]');
  const query = new URLSearchParams(window.location.search).get("q")?.trim() || "";
  const terms = query
    .normalize("NFKC")
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  if (queryInput) queryInput.value = query;

  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const appendHighlightedText = (container, text) => {
    const alternatives = terms
      .map(escapeRegExp)
      .sort((first, second) => second.length - first.length)
      .join("|");
    const pattern = new RegExp(`(${alternatives})`, "giu");

    text.split(pattern).forEach(part => {
      if (terms.includes(part.normalize("NFKC").toLocaleLowerCase())) {
        const mark = document.createElement("mark");
        mark.textContent = part;
        container.append(mark);
      } else {
        container.append(document.createTextNode(part));
      }
    });
  };

  const getExcerpt = page => {
    const sources = [page.summary, page.content].filter(Boolean);
    const text = sources.find(source => {
      const normalizedSource = source.normalize("NFKC").toLocaleLowerCase();
      return terms.some(term => normalizedSource.includes(term));
    }) || sources[0] || "";
    const normalizedText = text.normalize("NFKC").toLocaleLowerCase();
    const matchIndex = terms
      .map(term => normalizedText.indexOf(term))
      .filter(index => index >= 0)
      .sort((first, second) => first - second)[0];

    if (matchIndex === undefined) return text.slice(0, 220);

    const start = Math.max(0, matchIndex - 80);
    const end = Math.min(text.length, matchIndex + 180);
    return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
  };

  if (terms.length === 0) {
    status.textContent = "请输入关键词开始搜索。";
  } else {
    status.textContent = "正在搜索…";

    fetch(searchResults.dataset.indexUrl)
      .then(response => {
        if (!response.ok) throw new Error("Search index request failed");
        return response.json();
      })
      .then(pages => {
        const matches = pages.filter(page => {
          const searchableText = [page.title, page.summary, page.content, ...(page.tags || [])]
            .join(" ")
            .normalize("NFKC")
            .toLocaleLowerCase();
          return terms.every(term => searchableText.includes(term));
        });

        status.textContent = `找到 ${matches.length} 条结果`;

        matches.forEach(page => {
          const article = document.createElement("article");
          article.className = "search-result";

          const heading = document.createElement("h2");
          heading.className = "search-result__title";
          const link = document.createElement("a");
          link.href = page.url;
          appendHighlightedText(link, page.title);
          heading.append(link);
          article.append(heading);

          const excerpt = getExcerpt(page);
          if (excerpt) {
            const summary = document.createElement("p");
            summary.className = "search-result__summary";
            appendHighlightedText(summary, excerpt);
            article.append(summary);
          }

          searchResults.append(article);
        });
      })
      .catch(() => {
        status.textContent = "搜索索引暂时无法加载。";
      });
  }
}