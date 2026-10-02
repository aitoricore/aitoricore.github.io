const commentSections = document.querySelectorAll("[data-comment-section]");

commentSections.forEach(section => {
  const form = section.querySelector("[data-comment-form]");
  const submitButton = form.querySelector('button[type="submit"]');
  const formStatus = section.querySelector("[data-comment-status]");
  const listStatus = section.querySelector("[data-comments-list-status]");
  const approvedComments = section.querySelector("[data-approved-comments]");
  const endpoint = new URL("/api/comments", section.dataset.apiUrl);

  const renderComment = comment => {
    const article = document.createElement("article");
    article.className = "comment-item";

    const meta = document.createElement("div");
    meta.className = "comment-item__meta";

    const author = document.createElement("strong");
    author.textContent = comment.author || "匿名";
    meta.append(author);

    const createdAt = new Date(comment.createdAt);
    if (!Number.isNaN(createdAt.getTime())) {
      const time = document.createElement("time");
      time.dateTime = createdAt.toISOString();
      time.textContent = new Intl.DateTimeFormat("zh-CN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(createdAt);
      meta.append(time);
    }

    const content = document.createElement("p");
    content.className = "comment-item__content";
    content.textContent = comment.content || "";

    article.append(meta, content);
    approvedComments.append(article);
  };

  const loadComments = async () => {
    const url = new URL(endpoint);
    url.searchParams.set("postId", section.dataset.postId);
    url.searchParams.set("limit", "20");

    try {
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Comment list request failed");

      approvedComments.replaceChildren();
      result.comments.forEach(renderComment);
      listStatus.textContent = result.comments.length
        ? `共 ${result.comments.length} 条已审核评论`
        : "暂无已审核评论。";
    } catch {
      listStatus.textContent = "评论暂时无法加载。";
    }
  };

  form.addEventListener("submit", async event => {
    event.preventDefault();
    formStatus.textContent = "";

    const formData = new FormData(form);
    const content = String(formData.get("content") || "").trim();
    if (!content) {
      formStatus.textContent = "请填写评论内容。";
      return;
    }

    const payload = {
      postId: section.dataset.postId,
      postTitle: section.dataset.postTitle,
      author: String(formData.get("author") || "").trim(),
      content,
      website: String(formData.get("website") || ""),
      parentId: null,
    };

    submitButton.disabled = true;
    form.setAttribute("aria-busy", "true");
    formStatus.textContent = "正在提交…";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Comment submission failed");

      form.reset();
      formStatus.textContent = result.message || "评论已提交，审核后显示。";
    } catch {
      formStatus.textContent = "评论提交失败，请稍后重试。";
    } finally {
      submitButton.disabled = false;
      form.removeAttribute("aria-busy");
    }
  });

  loadComments();
});