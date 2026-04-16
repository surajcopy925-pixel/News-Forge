import { render, screen, waitFor } from '../../../test-utils/render';
import StoryCreationForm from '@/components/input/StoryCreationForm';

// Mock the store
const mockCreateStory = jest.fn();
jest.mock('@/store/useNewsForgeStore', () => ({
  useNewsForgeStore: (selector: any) =>
    selector({
      stories: [],
      createStory: mockCreateStory,
    }),
}));

describe('StoryCreationForm', () => {
  beforeEach(() => {
    mockCreateStory.mockClear();
  });

  it('renders all required form fields', () => {
    render(<StoryCreationForm />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/slug/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/format/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/script/i)).toBeInTheDocument();
  });

  it('shows format options: PKG, VO, ANCHOR', () => {
    render(<StoryCreationForm />);

    const formatSelect = screen.getByLabelText(/format/i);
    expect(formatSelect).toBeInTheDocument();

    // Check options exist
    expect(screen.getByText('PKG')).toBeInTheDocument();
    expect(screen.getByText('VO')).toBeInTheDocument();
    expect(screen.getByText('ANCHOR')).toBeInTheDocument();
  });

  it('creates a story on valid submission', async () => {
    const { user } = render(<StoryCreationForm />);

    await user.type(screen.getByLabelText(/title/i), 'New Breaking Story');
    await user.type(screen.getByLabelText(/slug/i), 'breaking-story');
    await user.selectOptions(screen.getByLabelText(/format/i), 'PKG');
    await user.type(screen.getByLabelText(/script/i), 'Raw script content');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockCreateStory).toHaveBeenCalledTimes(1);
      expect(mockCreateStory).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Breaking Story',
          slug: 'breaking-story',
          format: 'PKG',
          rawScript: 'Raw script content',
          status: 'DRAFT',
        })
      );
    });
  });

  it('validates required title field', async () => {
    const { user } = render(<StoryCreationForm />);

    // Try to submit without title
    await user.click(screen.getByRole('button', { name: /create/i }));

    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
    expect(mockCreateStory).not.toHaveBeenCalled();
  });
});
