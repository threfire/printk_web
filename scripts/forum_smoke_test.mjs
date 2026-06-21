const inputBase = process.argv[2] ?? "http://127.0.0.1:3000";
const base = inputBase.replace(/\/+$/, "");
const inputApiBase = process.argv[3] ?? "http://127.0.0.1:8000";
const apiBase = inputApiBase.replace(/\/+$/, "");
const adminPassword = process.env.ADMIN_PASSWORD ?? "weareprintk";
const account = `forumtest${Date.now()}`;
let cookieJar = "";

function updateCookies(response) {
  const setCookies = response.headers.getSetCookie?.() ?? [];
  const cookieMap = new Map(
    cookieJar
      .split(/;\s*/)
      .filter(Boolean)
      .map((item) => {
        const index = item.indexOf("=");
        if (index < 0) {
          return [item, ""];
        }
        return [item.slice(0, index), item.slice(index + 1)];
      }),
  );

  for (const value of setCookies) {
    const pair = value.split(";", 1)[0] ?? "";
    const index = pair.indexOf("=");
    if (index < 0) {
      continue;
    }
    cookieMap.set(pair.slice(0, index), pair.slice(index + 1));
  }

  cookieJar = Array.from(cookieMap.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function formPost(path, body, referer) {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      referer,
      cookie: cookieJar,
    },
    body: new URLSearchParams(body),
  });
  updateCookies(response);
  return response;
}

async function getText(path) {
  const response = await fetch(`${base}${path}`, {
    headers: {
      cookie: cookieJar,
    },
  });
  updateCookies(response);
  if (!response.ok) {
    throw new Error(`页面请求失败：${path} ${response.status}`);
  }
  return response.text();
}

function requireStatus(response, allowed, label) {
  if (!allowed.includes(response.status)) {
    throw new Error(`${label}状态异常：${response.status}`);
  }
}

function requireCookie(name, expected) {
  if (!cookieJar.includes(`${name}=${expected}`)) {
    throw new Error(`缺少Cookie：${name}`);
  }
}

function requireMatch(value, pattern, label) {
  const match = value.match(pattern);
  if (!match) {
    throw new Error(`${label}未匹配：${value}`);
  }
  return match;
}

async function apiJson(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, options);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`接口请求失败：${path} ${response.status} ${message}`);
  }
  return response.json();
}

async function adminToken() {
  const result = await apiJson("/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      password: adminPassword,
      role: "admin",
    }),
  });
  return result.token;
}

async function moderatePost(token, title, status) {
  const data = await apiJson("/api/admin/forum", {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  const post = data.posts.find((item) => item.author_account === account && item.title === title);
  if (!post) {
    throw new Error("管理员列表未找到待审核帖子");
  }
  await apiJson(`/api/admin/forum/posts/${encodeURIComponent(post.id)}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  return post.id;
}

async function moderateReply(token, postId, content, status) {
  const data = await apiJson("/api/admin/forum", {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  const reply = data.replies.find(
    (item) => item.post_id === postId && item.author_account === account && item.content === content,
  );
  if (!reply) {
    throw new Error("管理员列表未找到待审核回复");
  }
  await apiJson(`/api/admin/forum/replies/${encodeURIComponent(reply.id)}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  return reply.id;
}

await formPost(
  "/account/register",
  {
    account,
    password: "forum123456",
    confirmPassword: "forum123456",
    full_name: "论坛联调",
    gender: "",
    grade: "",
    member_status: "",
    department: "",
    phone: "",
    email: "",
    bio: "",
  },
  `${base}/`,
).then((response) => requireStatus(response, [303], "注册"));

requireCookie("printk-site-account", account);

const postResponse = await formPost(
  "/forum/posts",
  {
    title: "联调发帖测试",
    content: "链路验证：发帖成功。",
  },
  `${base}/forum`,
);
requireStatus(postResponse, [303, 307], "发帖");
const postLocation = postResponse.headers.get("location") ?? "";
if (!postLocation.includes("/forum")) {
  throw new Error(`发帖跳转异常：${postLocation}`);
}

const token = await adminToken();
const postId = await moderatePost(token, "联调发帖测试", "approved");

const postHtml = await getText(`/forum/${postId}`);
if (!postHtml.includes("联调发帖测试")) {
  throw new Error("帖子详情未包含标题");
}

const replyResponse = await formPost(
  `/forum/posts/${postId}/replies`,
  {
    content: "链路验证：回复成功。",
  },
  `${base}/forum/${postId}`,
);
requireStatus(replyResponse, [303, 307], "回复");

await moderateReply(token, postId, "链路验证：回复成功。", "approved");

const replyHtml = await getText(`/forum/${postId}`);
if (!replyHtml.includes("链路验证：回复成功。")) {
  throw new Error("帖子详情未包含回复");
}

await apiJson(`/api/admin/forum/posts/${encodeURIComponent(postId)}`, {
  method: "DELETE",
  headers: {
    authorization: `Bearer ${token}`,
  },
});

console.log(
  JSON.stringify({
    base,
    apiBase,
    account,
    postId,
    result: "ok",
  }),
);
