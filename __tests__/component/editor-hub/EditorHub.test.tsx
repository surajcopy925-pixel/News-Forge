import { render, screen } from '../../../test-utils/render';
import EditorHub from '@/app/(main)/editor-hub/page';

jest.mock('@/store/useNewsForgeStore', () => ({
  useNewsForgeStore: (selector: any) =>
    selector({
      storyClips: [
        {
          clipId: 'CLIP-001',
          storyId: 'STY-2026-0001-KN',
          fileName: 'footage.mxf',
          status: 'AVAILABLE',
          claimedBy: null,
        },
        {
          clipId: 'CLIP-002',
          storyId: 'STY-2026-0002-EN',
          fileName: 'interview.mov',
          status: 'IN_PROGRESS',
          claimedBy: 'USR-001',
        },
      ],
      stories: [
        {
          storyId: 'STY-2026-0001-KN',
          title: 'ಕನ್ನಡ ಕಥೆ',
          status: 'DRAFT',
          polishedScript: '',
          category: 'Politics',
        },
      ],
      updateClip: jest.fn(),
      updateStoryField: jest.fn(),
      getStoriesForCopyEditor: () => [
        {
          storyId: 'STY-2026-0001-KN',
          title: 'ಕನ್ನಡ ಕಥೆ',
          status: 'DRAFT',
          polishedScript: '',
        }
      ],
    }),
}));

describe('Editor Hub Page', () => {
  it('renders video and copy editor tabs', () => {
    render(<EditorHub />);

    expect(screen.getByText(/video editor/i)).toBeInTheDocument();
    expect(screen.getByText(/copy editor/i)).toBeInTheDocument();
  });

  it('shows available clips in video editor view', async () => {
    const { user } = render(<EditorHub />);

    // Click video editor tab
    await user.click(screen.getByText(/video editor/i));

    expect(screen.getByText('footage.mxf')).toBeInTheDocument();
    expect(screen.getByText('AVAILABLE')).toBeInTheDocument();
  });

  it('switches to copy editor view', async () => {
    const { user } = render(<EditorHub />);
    await user.click(screen.getByText(/copy editor/i));

    // Should show story scripts for editing
    expect(screen.getByText('ಕನ್ನಡ ಕಥೆ')).toBeInTheDocument();
  });
});
