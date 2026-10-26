import { API_BASE_URL, addPost, deletePost, getPosts, updatePost, uploadProfileImage } from './api';

describe('api service', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('fetches posts from the backend API', async () => {
    const expected = [
      {
        id: 1,
        title: 'Test post',
        category: 'News',
        description: 'Demo content',
        image: 'https://example.com/image.jpg',
        summary: 'Demo content',
        content: 'Demo content',
        status: 'approved',
      },
    ];

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => expected,
    });

    const result = await getPosts();

    expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/posts`);
    expect(result).toMatchObject(expected);
  });

  it('uploads a post with its fields and image as multipart form data', async () => {
    const formData = new FormData();
    formData.append('title', 'New post');
    formData.append('description', 'Uploaded from admin dashboard');
    formData.append('category', 'Amakuru');
    formData.append('image', new File(['image content'], 'news.png', { type: 'image/png' }));

    const expected = {
      id: 2,
      title: 'New post',
      category: 'Amakuru',
      description: 'Uploaded from admin dashboard',
      image: 'data:image/png;base64,aW1hZ2UgY29udGVudA==',
    };

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => expected,
    });

    const result = await addPost(formData);

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/posts`,
      expect.objectContaining({
        method: 'POST',
      })
    );

    const requestBody = global.fetch.mock.calls[0][1].body;
    expect(requestBody).toBeInstanceOf(FormData);
    expect(requestBody.get('title')).toBe('New post');
    expect(requestBody.get('description')).toBe('Uploaded from admin dashboard');
    expect(requestBody.get('category')).toBe('Amakuru');
    expect(requestBody.get('image')).toBeInstanceOf(File);
    expect(result).toEqual(expected);
  });

  it('updates and deletes posts through the API service', async () => {
    const formData = new FormData();
    formData.append('title', 'Updated post');
    formData.append('description', 'Updated content');
    formData.append('category', 'Ubukungu');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 7, title: 'Updated post', category: 'Ubukungu', description: 'Updated content', image: null }),
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const updated = await updatePost(7, formData);
    const deleted = await deletePost(7);

    expect(updated.title).toBe('Updated post');
    expect(deleted).toEqual({ success: true });
  });

  it('stores profile image URLs from the canonical auth payload', async () => {
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        profile_image: '/uploads/profiles/profile-7.png',
        profile_image_url: '/uploads/profiles/profile-7.png',
      }),
    });

    localStorage.setItem('token', 'abc123');
    localStorage.setItem('user', JSON.stringify({ id: 7, full_name: 'Test User', role_type: 'employee' }));

    await uploadProfileImage(file);

    const stored = JSON.parse(localStorage.getItem('user'));
    expect(stored.profile_image).toBe('/uploads/profiles/profile-7.png');
    expect(stored.profile_image_url).toBe('/uploads/profiles/profile-7.png');
  });

  it('sends the selected profile File under the backend image field', async () => {
    const file = new File(['avatar'], 'avatar.webp', { type: 'image/webp' });

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        profile_image: '/uploads/profiles/profile-7.webp',
        profile_image_url: '/uploads/profiles/profile-7.webp',
      }),
    });

    localStorage.setItem('token', 'abc123');
    localStorage.setItem('user', JSON.stringify({ id: 7, full_name: 'Test User' }));

    await uploadProfileImage(file);

    const requestBody = global.fetch.mock.calls[0][1].body;
    expect(requestBody.get('image')).toBe(file);
  });
});
